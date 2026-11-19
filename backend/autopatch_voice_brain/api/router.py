"""
FastAPI Router for AutoPatch Voice Agent.
Can be mounted directly into any FastAPI app: `app.include_router(autopatch_voice_router)`.
"""

from __future__ import annotations

import logging
import urllib.parse
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from twilio.twiml.voice_response import VoiceResponse

from autopatch_voice_brain.config import settings
from autopatch_voice_brain.core.brain import (
    select_voice_and_lang,
    init_call_session,
    generate_autopatch_reply,
    end_call_session,
    call_contexts,
)
from autopatch_voice_brain.core.prompt import build_autopatch_greeting

logger = logging.getLogger("autopatch.api")

router = APIRouter(prefix="/autopatch-voice", tags=["AutoPatch Voice Agent"])


class OutboundCallRequest(BaseModel):
    to_phone_number: str
    developer_name: str = "Developer"
    file_or_module: str = "main.py"
    broken_code_summary: str = "SyntaxError on line 42 due to missing bracket"
    fix_details: str = "Added missing closing bracket and null check"
    test_results: str = "All unit tests passing"


class OutboundCallResponse(BaseModel):
    success: bool
    call_sid: str | None = None
    message: str
    webhook_url: str


def format_phone_number(raw: str) -> str:
    """Format phone number with international country prefix."""
    num = raw.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if not num.startswith("+"):
        if len(num) == 10 and num[0] in "6789":
            return f"+91{num}"
        elif len(num) == 10:
            return f"+1{num}"
        else:
            return f"+{num}"
    return num


# ─── Outbound Call Trigger ───────────────────────────────────────────────────

@router.post("/call", response_model=OutboundCallResponse)
async def trigger_autopatch_call(req: OutboundCallRequest):
    """
    Trigger a 2-way interactive AI phone call to a developer about an AutoPatch repair.
    """
    if not settings.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Twilio or Groq credentials are not configured in settings or environment.",
        )

    formatted_number = format_phone_number(req.to_phone_number)
    voice, lang = select_voice_and_lang(formatted_number)

    # Encode query parameters for Twilio webhook URL
    base_url = settings.twilio_webhook_base_url
    query_params = urllib.parse.urlencode({
        "name": req.developer_name,
        "file": req.file_or_module,
        "broken": req.broken_code_summary,
        "fix": req.fix_details,
        "tests": req.test_results,
        "voice": voice,
        "lang": lang,
    })
    start_url = f"{base_url}/api/v1/autopatch-voice/voice-start?{query_params}"

    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        call = client.calls.create(
            to=formatted_number,
            from_=settings.twilio_phone_number,
            url=start_url,
            method="POST",
        )

        return OutboundCallResponse(
            success=True,
            call_sid=call.sid,
            message=f"AutoPatch calling {req.developer_name} at {formatted_number}",
            webhook_url=start_url,
        )

    except TwilioRestException as e:
        if e.code == 21219 or "unverified" in str(e).lower():
            raise HTTPException(
                status_code=400,
                detail=f"Twilio Trial: {formatted_number} is not verified. Visit https://console.twilio.com/us1/develop/phone-numbers/manage/verified",
            )
        raise HTTPException(status_code=500, detail=f"Twilio API Error ({e.code}): {e.msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to place call: {str(e)}")


# ─── Webhook: Call Answered Greeting ─────────────────────────────────────────

@router.post("/voice-start")
async def voice_start(request: Request):
    """
    Invoked by Twilio the instant the developer answers the phone.
    Greets with human conversational voice and initiates the speech listener.
    """
    form_data = await request.form()
    call_sid = str(form_data.get("CallSid") or "default")

    q = request.query_params
    dev_name = q.get("name", "there")
    file_name = q.get("file", "your latest code")
    broken_desc = q.get("broken", "a code issue")
    fix_desc = q.get("fix", "our automated patch")
    test_desc = q.get("tests", "all tests passing")
    voice = q.get("voice", settings.default_voice_in)
    lang = q.get("lang", settings.default_lang_in)

    greeting = build_autopatch_greeting(dev_name, file_name, broken_desc)

    # Initialize stateful conversation
    init_call_session(
        call_sid=call_sid,
        developer_name=dev_name,
        file_or_module=file_name,
        broken_code_summary=broken_desc,
        fix_details=fix_desc,
        test_results=test_desc,
        initial_greeting=greeting,
    )

    base_url = settings.twilio_webhook_base_url
    encoded_query = urllib.parse.urlencode({
        "name": dev_name,
        "file": file_name,
        "voice": voice,
        "lang": lang,
    })
    respond_url = f"{base_url}/api/v1/autopatch-voice/voice-respond?{encoded_query}"

    vr = VoiceResponse()
    vr.pause(length=1)

    gather = vr.gather(
        input="speech",
        action=respond_url,
        method="POST",
        timeout=6,
        speech_timeout="auto",
        language=lang,
        speech_model="experimental_conversations",
    )
    gather.say(greeting, voice=voice, language=lang)

    # If developer says nothing after greeting
    vr.say(
        "Hey, are you still there? No worries if now isn't a good time. Check your pull request on GitHub whenever you are free. Talk soon!",
        voice=voice,
        language=lang,
    )
    vr.hangup()

    return Response(content=str(vr), media_type="application/xml")


# ─── Webhook: Interactive Speech Dialogue ───────────────────────────────────

@router.post("/voice-respond")
async def voice_respond(request: Request):
    """
    Twilio posts the transcribed developer speech here.
    Processes what was broken, how it was fixed, or answers technical questions interactively.
    """
    form_data = await request.form()
    call_sid = str(form_data.get("CallSid") or "default")
    user_speech = str(form_data.get("SpeechResult", "")).strip()

    q = request.query_params
    dev_name = q.get("name", "Developer")
    file_name = q.get("file", "the code")
    voice = q.get("voice", settings.default_voice_in)
    lang = q.get("lang", settings.default_lang_in)

    vr = VoiceResponse()

    # Check for call termination or approval words
    closing_terms = ["bye", "goodbye", "thanks", "thank you", "that's all", "thats all", "done", "deploy it", "looks good", "merge it"]
    if user_speech and any(term in user_speech.lower() for term in closing_terms):
        if any(term in user_speech.lower() for term in ["deploy it", "looks good", "merge it", "commit it", "ship it"]):
            farewell = f"Awesome! I've marked the patch as approved and committed the changes to your branch. Have a great day, {dev_name}!"
        else:
            farewell = f"You got it, {dev_name}! Glad I could help out. Take care, bye bye!"
        
        vr.say(farewell, voice=voice, language=lang)
        vr.hangup()
        end_call_session(call_sid)
        return Response(content=str(vr), media_type="application/xml")

    # Generate live answer
    if user_speech:
        fallback_ctx = {
            "name": dev_name,
            "file": file_name,
            "broken": "syntax or logic error",
            "fix": "applied automated patch",
        }
        ai_reply = await generate_autopatch_reply(call_sid, user_speech, fallback_context=fallback_ctx)
    else:
        ai_reply = "Hey, I'm still right here. Let me know if you want me to explain the broken code or how we patched it."

    base_url = settings.twilio_webhook_base_url
    encoded_query = urllib.parse.urlencode({
        "name": dev_name,
        "file": file_name,
        "voice": voice,
        "lang": lang,
    })
    respond_url = f"{base_url}/api/v1/autopatch-voice/voice-respond?{encoded_query}"

    # Loop gather for continuous back-and-forth phone conversation
    gather = vr.gather(
        input="speech",
        action=respond_url,
        method="POST",
        timeout=6,
        speech_timeout="auto",
        language=lang,
        speech_model="experimental_conversations",
    )
    gather.say(ai_reply, voice=voice, language=lang)

    # Silence fallback
    vr.say("Looks like we might have gotten disconnected. Feel free to review the patch in your repo anytime. Goodbye!", voice=voice, language=lang)
    vr.hangup()

    return Response(content=str(vr), media_type="application/xml")


# ─── Status Endpoint ─────────────────────────────────────────────────────────

@router.get("/status")
async def autopatch_voice_status():
    """Verify AutoPatch voice agent status and webhook connectivity."""
    return {
        "status": "active",
        "service": "AutoPatch Voice Agent Brain",
        "configured": settings.is_configured,
        "twilio_phone_number": settings.twilio_phone_number if settings.is_configured else None,
        "voices": {
            "india": f"{settings.default_voice_in} ({settings.default_lang_in})",
            "us": f"{settings.default_voice_us} ({settings.default_lang_us})",
        },
        "webhook_base_url": settings.twilio_webhook_base_url,
    }
