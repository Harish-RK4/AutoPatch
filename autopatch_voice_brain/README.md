# 🧠 AutoPatch Voice Agent Brain

A self-contained, modular conversational AI calling brain designed to give **AutoPatch** (or any automated code-repair / dataset-healing tool) a **real human phone presence**.

Instead of robotic speech or confusing tracebacks, the agent calls developers on their mobile phones and talks like a senior software engineer:
- Explains **what code was broken** in the last run (syntax errors, null pointers, unclosed brackets, etc.)
- Explains **how it was fixed** (logic patch, added defensive guards, regex imputation)
- Explains **dataset issues** (mismatched columns, corrupted rows, missing values)
- Answers questions dynamically in conversational 1–2 sentence dialogue
- Commits/deploys the patch upon verbal approval (*"looks good, merge it"*)

---

## 📁 Directory Structure

```
autopatch_voice_brain/
├── __init__.py                # Clean Python package exports
├── config.py                  # Twilio, Groq, and neural voice settings
├── core/
│   ├── brain.py               # Conversational LLM brain with multi-turn memory
│   ├── prompt.py              # Human engineer persona & dialogue prompts
│   └── speech_sanitizer.py    # Translates raw syntax errors/diffs into spoken English
├── api/
│   ├── router.py              # FastAPI APIRouter (mount into any FastAPI app)
│   └── standalone_server.py   # Standalone microservice runner
├── client/
│   └── caller.py              # 1-Line Python SDK Client for AutoPatch
├── tests/
│   └── test_brain.py          # Complete self-test suite
├── .env.example               # Environment variables template
└── README.md                  # This documentation
```

---

## 🚀 How to Integrate into AutoPatch

You can integrate this brain in **3 simple ways**:

### Option 1: 1-Line Python SDK (Easiest)

Inside your AutoPatch code:

```python
from autopatch_voice_brain import AutoPatchVoiceClient

# Initialize client
client = AutoPatchVoiceClient(api_base_url="https://your-public-tunnel-or-api.com")

# Call the developer when a patch is generated
client.notify_fix(
    phone_number="+919876543210",
    developer_name="Harish",
    file_or_module="auth/login_handler.py",
    broken_code="SyntaxError: unclosed parenthesis at line 42 breaking user login",
    fix_applied="Added closing parenthesis and defensive token null-check",
    test_results="Passed 14 unit tests with 100% pass rate",
)
```

---

### Option 2: Mount into an Existing FastAPI App

If AutoPatch already has a backend:

```python
from fastapi import FastAPI
from autopatch_voice_brain import autopatch_voice_router

app = FastAPI()

# Mount AutoPatch Voice endpoints
app.include_router(autopatch_voice_router, prefix="/api/v1")
```

This immediately registers:
- `POST /api/v1/autopatch-voice/call` (Triggers outbound interactive call)
- `POST /api/v1/autopatch-voice/voice-start` (Twilio phone answered webhook)
- `POST /api/v1/autopatch-voice/voice-respond` (Twilio interactive 2-way speech loop)
- `GET  /api/v1/autopatch-voice/status` (Health & voice configuration check)

---

### Option 3: Run as a Standalone Microservice

Run the brain as its own dedicated server:

```bash
cd autopatch_voice_brain
python -m autopatch_voice_brain.api.standalone_server
```

Or run via Uvicorn:
```bash
uvicorn autopatch_voice_brain.api.standalone_server:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🎙️ Natural Human Speech Technology

1. **Speech Sanitizer (`core/speech_sanitizer.py`):**
   Converts code errors like:
   `SyntaxError: unexpected EOF while parsing at line 42 with df.dropna()`
   Into natural spoken English:
   *"a syntax error from an unclosed bracket or block at line 42 with the dataset missing values"*

2. **Amazon Polly Neural Lifelike Voices:**
   - **Indian Mobile Numbers (`+91`):** `Polly.Kajal-Neural` (`en-IN`)
   - **US/Global Mobile Numbers (`+1`):** `Polly.Joanna-Neural` (`en-US`)
   - Automatically matched with `<Say voice=... language=...>` to prevent Twilio XML errors.

3. **Multi-turn Memory (`core/brain.py`):**
   Alex remembers the previous turns of the call so developers can ask natural follow-up questions:
   - *"Wait, what was broken in line 42 again?"*
   - *"How did you fix it?"*
   - *"What tests did you run?"*
   - *"Go ahead and deploy it."*

---

## 🧪 Testing the Brain

Run the automated test suite anytime:

```bash
python autopatch_voice_brain/tests/test_brain.py
```
