"""
Automated self-tests for AutoPatch Voice Brain.
Tests speech sanitization, TwiML generation, and LLM explanation of broken code & fixes.
"""

import sys
import asyncio
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

from autopatch_voice_brain.core.speech_sanitizer import sanitize_code_for_speech
from autopatch_voice_brain.core.brain import (
    init_call_session,
    generate_autopatch_reply,
    select_voice_and_lang,
)
from autopatch_voice_brain.core.prompt import build_autopatch_greeting


def test_speech_sanitization():
    print("[1/3] Testing Speech Sanitizer...")
    raw_error = "SyntaxError: unexpected EOF while parsing at line 42 with `df.dropna(subset=['id'])`"
    cleaned = sanitize_code_for_speech(raw_error)
    print(f"  Raw:     {raw_error}")
    print(f"  Cleaned: {cleaned}")
    assert "SyntaxError" not in cleaned
    assert "syntax error" in cleaned
    print("  ✓ Speech Sanitizer passed!")


def test_voice_selection():
    print("[2/3] Testing Voice & Language Auto-Selection...")
    v_in, l_in = select_voice_and_lang("+919876543210")
    assert v_in == "Polly.Kajal-Neural" and l_in == "en-IN"

    v_us, l_us = select_voice_and_lang("+14155552671")
    assert v_us == "Polly.Joanna-Neural" and l_us == "en-US"
    print(f"  ✓ India: {v_in} ({l_in})")
    print(f"  ✓ US:    {v_us} ({l_us})")


async def test_llm_explanation():
    print("[3/3] Testing AutoPatch LLM Conversation (Groq)...")
    call_sid = "test-call-autopatch-001"
    
    init_call_session(
        call_sid=call_sid,
        developer_name="Harish",
        file_or_module="auth/jwt_validator.py",
        broken_code_summary="SyntaxError: unclosed parenthesis at line 42, causing login failures",
        fix_details="Added closing parenthesis and added null-check guard on user token",
        test_results="Passed 14 unit tests with 100% coverage",
    )

    # Test question 1: What was broken?
    print("  Q1: 'What code was broken in the last code I gave you?'")
    reply1 = await generate_autopatch_reply(call_sid, "What code was broken in the last code I gave you?")
    print(f"  A1: {reply1}\n")

    # Test question 2: How is it fixed?
    print("  Q2: 'And how did you fix it?'")
    reply2 = await generate_autopatch_reply(call_sid, "And how did you fix it?")
    print(f"  A2: {reply2}\n")

    # Test question 3: Approval
    print("  Q3: 'Looks great, deploy it.'")
    reply3 = await generate_autopatch_reply(call_sid, "Looks great, deploy it.")
    print(f"  A3: {reply3}\n")

    assert len(reply1) > 10
    assert len(reply2) > 10
    print("  ✓ LLM AutoPatch conversation passed!")


def main():
    test_speech_sanitization()
    test_voice_selection()
    asyncio.run(test_llm_explanation())
    print("\n🎉 ALL AUTOPATCH BRAIN TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    main()
