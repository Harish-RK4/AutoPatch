import os
import urllib.request
import urllib.error
import json
import time
import random
from pathlib import Path

# Load env variables dynamically from .env or frontend/.env.local
env_file = Path(__file__).resolve().parent.parent / "frontend" / ".env.local"
if not env_file.exists():
    env_file = Path(__file__).resolve().parent.parent / ".env"

if env_file.exists():
    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://qqgwmkqfdoayiblculhf.supabase.co")
ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

def post_json(url, data, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=json.dumps(data).encode(), headers=h)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body}

def main():
    print("=== 1. TEST PASSWORD CRITERIA FOR REGISTRATION ===")
    weak_cases = [
        ("short", "Aa1!"),                          # < 8 chars
        ("no_upper", "lowercase123!"),             # no uppercase
        ("no_lower", "UPPERCASE123!"),             # no lowercase
        ("no_number_or_sym", "PasswordOnlyLetters"), # no number/symbol
    ]
    for name, pwd in weak_cases:
        code, res = post_json(f"{BASE_URL}/api/auth/register", {
            "email": f"test_{name}_{int(time.time())}@example.com",
            "password": pwd,
            "full_name": "Test User"
        })
        assert code == 400, f"Expected 400 for {name}, got {code}: {res}"
        err = res.get("error", "")
        print(f"  [PASS] {name} rejected with: {err}")

    test_email = f"dev_{int(time.time())}_{random.randint(100, 999)}@example.com"
    valid_pwd = "SecurePassword2026!"
    code, res = post_json(f"{BASE_URL}/api/auth/register", {
        "email": test_email,
        "password": valid_pwd,
        "full_name": "Real Developer"
    })
    assert code == 200, f"Expected 200 for valid registration, got {code}: {res}"
    print(f"  [PASS] Valid registration succeeded: {res}")

    print("\n=== 2. TEST LOGIN & WRONG PASSWORD REJECTION ===")
    code, res = post_json(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", {
        "email": test_email,
        "password": "WrongPassword123!"
    }, headers={"apikey": ANON_KEY})
    assert code == 400, f"Expected 400 for wrong password, got {code}"
    print(f"  [PASS] Wrong password correctly rejected: {res.get('error_description') or res.get('msg')}")

    code, res = post_json(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", {
        "email": test_email,
        "password": valid_pwd
    }, headers={"apikey": ANON_KEY})
    assert code == 200 and "access_token" in res, f"Expected 200 with access token, got {code}"
    print(f"  [PASS] Valid password login succeeded. User ID: {res['user']['id']}")

    print("\n=== 3. TEST REAL SUPABASE OTP FLOW ===")
    code, otp_gen = post_json(f"{BASE_URL}/api/auth/otp", {
        "action": "send",
        "email": test_email
    })
    assert code == 200 and "otp" in otp_gen, f"Failed to generate OTP: {otp_gen}"
    otp_code = otp_gen["otp"]
    print(f"  [PASS] Supabase OTP token generated: {otp_code}")

    code, verify_res = post_json(f"{SUPABASE_URL}/auth/v1/verify", {
        "email": test_email,
        "token": otp_code,
        "type": "magiclink"
    }, headers={"apikey": ANON_KEY})
    assert code == 200 and "access_token" in verify_res, f"Failed to verify OTP: {verify_res}"
    print(f"  [PASS] Supabase verified OTP successfully. Authenticated user: {verify_res['user']['id']}")

    print("\n=== 4. TEST GOOGLE OAUTH CONFIGURATION ===")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=http://localhost:3000/auth/callback",
        headers={"apikey": ANON_KEY}
    )
    with urllib.request.urlopen(req) as resp:
        assert "accounts.google.com" in resp.geturl(), f"Expected Google redirect, got {resp.geturl()}"
        print(f"  [PASS] Google OAuth redirects to: {resp.geturl()[:80]}...")

    print("\n==========================================")
    print("ALL AUTHENTICATION TEST SUITES PASSED 100%!")
    print("==========================================")

if __name__ == "__main__":
    main()
