"""
AutoPatch Voice Brain - Conversational LLM Engine.
Maintains call state, handles Groq API inference, and manages multi-turn dialogue.
"""

from __future__ import annotations

import logging
import httpx
from typing import Optional

from autopatch_voice_brain.config import settings
from autopatch_voice_brain.core.speech_sanitizer import sanitize_code_for_speech
from autopatch_voice_brain.core.prompt import build_autopatch_system_prompt

logger = logging.getLogger("autopatch.brain")

# Active call conversations cache: {call_sid: [messages]}
call_sessions: dict[str, list[dict[str, str]]] = {}

# Active call patch contexts: {call_sid: {developer_name, file_or_module, broken_code_summary, fix_details, test_results}}
call_contexts: dict[str, dict[str, str]] = {}


def select_voice_and_lang(phone_number: Optional[str] = None) -> tuple[str, str]:
    """Select appropriate Amazon Polly Neural voice and matching language."""
    if phone_number:
        clean = phone_number.strip().replace(" ", "").replace("-", "")
        if clean.startswith("+1") or (len(clean) == 10 and not clean.startswith(("+91", "6", "7", "8", "9"))):
            return settings.default_voice_us, settings.default_lang_us
    return settings.default_voice_in, settings.default_lang_in


def init_call_session(
    call_sid: str,
    developer_name: str,
    file_or_module: str,
    broken_code_summary: str,
    fix_details: str,
    test_results: str = "All tests passed",
    initial_greeting: Optional[str] = None,
):
    """Register context and create system prompt for a new call."""
    call_contexts[call_sid] = {
        "developer_name": developer_name,
        "file_or_module": file_or_module,
        "broken_code_summary": broken_code_summary,
        "fix_details": fix_details,
        "test_results": test_results,
    }

    system_prompt = build_autopatch_system_prompt(
        developer_name=developer_name,
        file_or_module=file_or_module,
        broken_code_summary=broken_code_summary,
        fix_details=fix_details,
        test_results=test_results,
    )

    messages = [{"role": "system", "content": system_prompt}]
    if initial_greeting:
        messages.append({"role": "assistant", "content": initial_greeting})

    call_sessions[call_sid] = messages
    logger.info(f"[AutoPatch Brain] Initialized session for call SID {call_sid}")


async def generate_autopatch_reply(
    call_sid: str,
    user_speech: str,
    fallback_context: Optional[dict[str, str]] = None,
) -> str:
    """
    Generate conversational reply using Groq LLM with full conversation history.
    """
    # Auto-initialize session if not present (e.g. Inbound call)
    if call_sid not in call_sessions:
        ctx = fallback_context or {}
        init_call_session(
            call_sid=call_sid,
            developer_name=ctx.get("name", "Developer"),
            file_or_module=ctx.get("file", "the codebase"),
            broken_code_summary=ctx.get("broken", "recent syntax or logic issue"),
            fix_details=ctx.get("fix", "auto-patched and verified"),
            test_results=ctx.get("tests", "all tests passing"),
        )

    # Append user speech
    call_sessions[call_sid].append({"role": "user", "content": user_speech})

    # Keep system prompt + last 8 conversational turns
    messages = [call_sessions[call_sid][0]] + call_sessions[call_sid][-8:]

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": messages,
                    "max_tokens": 160,
                    "temperature": 0.75,
                },
                timeout=7.0,
            )
            if resp.status_code == 200:
                raw_reply = resp.json()["choices"][0]["message"]["content"].strip()
                clean_reply = sanitize_code_for_speech(raw_reply)
                if clean_reply:
                    call_sessions[call_sid].append({"role": "assistant", "content": clean_reply})
                    logger.info(f"[AutoPatch Voice] User: {user_speech} -> Alex: {clean_reply}")
                    return clean_reply
    except Exception as e:
        logger.error(f"[AutoPatch Voice] Groq error: {e}")

    # Fallback response
    ctx = call_contexts.get(call_sid, {})
    fix = ctx.get("fix_details", "our automated patch")
    fallback = f"Right, so basically AutoPatch resolved the issue using {fix}. Would you like me to push this commit or explain any specific line?"
    call_sessions[call_sid].append({"role": "assistant", "content": fallback})
    return fallback


def end_call_session(call_sid: str):
    """Clean up memory when a call terminates."""
    call_sessions.pop(call_sid, None)
    call_contexts.pop(call_sid, None)
