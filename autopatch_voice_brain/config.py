"""
AutoPatch Voice Brain - Configuration
Loads settings from environment variables or .env file.
"""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Try loading .env from current dir or project root
current_dir = Path(__file__).resolve().parent
for candidate in [current_dir / ".env", current_dir.parent / ".env", current_dir.parent.parent / ".env"]:
    if candidate.exists():
        load_dotenv(candidate)
        break


class AutoPatchVoiceSettings:
    def __init__(self):
        # Twilio Telephony
        self.twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_phone_number: str = os.getenv("TWILIO_PHONE_NUMBER", "")
        self.twilio_webhook_base_url: str = (
            os.getenv("TWILIO_WEBHOOK_BASE_URL")
            or os.getenv("TWILIO_WEBHOOK_URL")
            or "https://richards-correct-remark-tray.trycloudflare.com"
        ).rstrip("/")

        # Groq LLM Intelligence
        self.groq_api_key: str = os.getenv("GROQ_API_KEY", "")
        self.groq_model: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

        # Preferred Amazon Polly Neural Voices for lifelike phone conversations
        self.default_voice_in: str = os.getenv("AUTOPATCH_VOICE_IN", "Polly.Kajal-Neural")
        self.default_lang_in: str = "en-IN"
        self.default_voice_us: str = os.getenv("AUTOPATCH_VOICE_US", "Polly.Joanna-Neural")
        self.default_lang_us: str = "en-US"

    @property
    def is_configured(self) -> bool:
        return bool(self.twilio_account_sid and self.twilio_auth_token and self.groq_api_key)


settings = AutoPatchVoiceSettings()
