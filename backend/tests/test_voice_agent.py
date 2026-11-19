"""
AutoPatch Voice Agent Integration Tests
Verifies that the conversational AI voice brain is mounted, responds to status checks,
and generates valid Twilio TwiML voice responses for developer calls.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_voice_agent_status():
    """Verify voice agent status endpoint returns active configuration."""
    resp = client.get("/api/v1/autopatch-voice/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["service"] == "AutoPatch Voice Agent Brain"
    assert "Polly.Kajal-Neural" in data["voices"]["india"]
    assert "Polly.Joanna-Neural" in data["voices"]["us"]


def test_twiml_voice_start_webhook():
    """Verify call-answered webhook returns valid TwiML XML greeting."""
    resp = client.post(
        "/api/v1/autopatch-voice/voice-start",
        params={
            "name": "Harish",
            "file": "auth.py",
            "broken": "syntax error on line 42",
            "fix": "closing bracket added",
            "voice": "Polly.Kajal-Neural",
            "lang": "en-IN",
        },
        data={"CallSid": "test-sid-123"},
    )
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]
    xml_text = resp.text
    assert "<Response>" in xml_text
    assert "<Gather" in xml_text
    assert "Alex" in xml_text
    assert "AutoPatch" in xml_text


def test_twiml_voice_respond_webhook():
    """Verify speech response webhook generates conversational reply."""
    resp = client.post(
        "/api/v1/autopatch-voice/voice-respond",
        params={
            "name": "Harish",
            "file": "auth.py",
            "voice": "Polly.Kajal-Neural",
            "lang": "en-IN",
        },
        data={
            "CallSid": "test-sid-123",
            "SpeechResult": "What code was broken in line 42?",
        },
    )
    assert resp.status_code == 200
    assert "application/xml" in resp.headers["content-type"]
    xml_text = resp.text
    assert "<Response>" in xml_text
    assert "<Say" in xml_text


def test_project_voice_call_endpoint_validation():
    """Verify project-level call endpoint checks project existence."""
    resp = client.post(
        "/api/v1/projects/non-existent-proj/call-ai",
        json={"phone_number": "+919876543210", "developer_name": "Harish"},
    )
    assert resp.status_code == 404
