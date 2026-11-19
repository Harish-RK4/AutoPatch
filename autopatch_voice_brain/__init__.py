"""
AutoPatch Voice Brain Package.
Self-contained conversational AI calling brain for code repair & dataset healing projects.
"""

from autopatch_voice_brain.client.caller import AutoPatchVoiceClient
from autopatch_voice_brain.api.router import router as autopatch_voice_router
from autopatch_voice_brain.core.brain import (
    generate_autopatch_reply,
    init_call_session,
    end_call_session,
    select_voice_and_lang,
)
from autopatch_voice_brain.core.speech_sanitizer import sanitize_code_for_speech
from autopatch_voice_brain.config import settings

__all__ = [
    "AutoPatchVoiceClient",
    "autopatch_voice_router",
    "generate_autopatch_reply",
    "init_call_session",
    "end_call_session",
    "select_voice_and_lang",
    "sanitize_code_for_speech",
    "settings",
]
