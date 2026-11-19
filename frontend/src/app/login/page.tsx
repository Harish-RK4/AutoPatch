"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Loader2, 
  KeyRound, 
  RotateCcw, 
  Check, 
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAuthProvider } from "@/lib/authProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "otp" ? "otp" : "signin";
  const initialError = searchParams.get("error");

  const authProvider = getAuthProvider();

  // Duplicate request prevention guard
  const requestInFlight = useRef(false);

  const [tab, setTab] = useState<"signin" | "otp" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "oauth_failed"
      ? "Google sign-in could not be completed. Please try again."
      : initialError || null
  );
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Success notifications
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP Flow States
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sentToInbox, setSentToInbox] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password criteria for Registration
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);
  const passwordCriteriaCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumberOrSymbol].filter(Boolean).length;
  const isPasswordValid = passwordCriteriaCount === 4;
  const isConfirmValid = Boolean(confirmPassword) && password === confirmPassword;

  // Check if user is already authenticated
  useEffect(() => {
    authProvider.getSession().then((session) => {
      if (session) {
        window.location.replace(redirectUrl);
      }
    });
  }, [authProvider, redirectUrl]);

  // Resend OTP Countdown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // 1. Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestInFlight.current) return;
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    requestInFlight.current = true;
    setLoading(true);

    try {
      const res = await authProvider.signIn(cleanEmail, password);
      if (res.user) {
        setSuccessMessage("Authenticated successfully! Redirecting to workspace...");
        window.location.replace(redirectUrl);
      } else {
        setError(res.error || "Invalid email or password. Please verify your credentials and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  // 2. Real Registration in Supabase (with strict password criteria)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestInFlight.current) return;
    setError(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid) {
      setError("Password does not meet all security criteria (8+ chars, uppercase, lowercase, and number/symbol).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both password fields match.");
      return;
    }

    requestInFlight.current = true;
    setLoading(true);

    try {
      const res = await authProvider.signUp(cleanName, cleanEmail, password);
      if (res.user) {
        setSuccessMessage("Account created successfully! Entering your workspace...");
        window.location.replace(redirectUrl);
      } else {
        setError(res.error || "Registration failed. Please check your information and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  // 3. Real Supabase OTP - Send Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (requestInFlight.current) return;
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = otpEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    try {
      const res = await authProvider.sendOtp(cleanEmail);
      if (res.success) {
        setOtpStep("verify");
        setResendCooldown(60);
        setSentToInbox(Boolean(res.sentToEmail));
      } else {
        setError(res.error || "Failed to send verification code. Please try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  // 4. Real Supabase OTP - Verify Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestInFlight.current) return;
    setError(null);
    setSuccessMessage(null);

    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanCode) {
      setError("Please enter the verification code.");
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    try {
      const res = await authProvider.verifyOtp(cleanEmail, cleanCode);
      if (res.user) {
        setSuccessMessage("Code verified! Redirecting to workspace...");
        window.location.replace(redirectUrl);
      } else {
        setError(res.error || "Invalid or expired verification code.");
      }
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  // 5. OAuth: Continue with Google
  const handleGoogleOAuth = async () => {
    if (requestInFlight.current) return;
    setError(null);
    requestInFlight.current = true;
    setLoading(true);
    try {
      const res = await authProvider.signInWithOAuth("google");
      if (res.error) {
        setError(res.error);
        setLoading(false);
        requestInFlight.current = false;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Google sign in.");
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  // 6. OAuth: Continue with GitHub
  const handleGitHubOAuth = async () => {
    if (requestInFlight.current) return;
    setError(null);
    requestInFlight.current = true;
    setLoading(true);
    try {
      const res = await authProvider.signInWithOAuth("github");
      if (res.error) {
        setError(res.error);
        setLoading(false);
        requestInFlight.current = false;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate GitHub sign in.");
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  const passwordCriteriaId = "password-criteria-checklist";

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#121214] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left: Technical Value & Value Proposition */}
        <div className="hidden md:flex flex-col justify-between p-8 lg:p-10 bg-[#FAFAFA] dark:bg-[#18181B] border-r border-[#E4E4E7] dark:border-[#27272A]">
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09] shadow-sm">
                <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
              </div>
              <span className="font-bold text-lg tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
                AutoPatch
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs mb-8">
              <div className="p-4 bg-white dark:bg-[#121214] rounded-xl border border-[#E4E4E7] dark:border-[#27272A] shadow-sm">
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 mb-1.5 font-semibold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5]" />
                  Defect Repro: calculate_percentage(-5, 100)
                </div>
                <div className="text-[11px] text-[#71717A] font-sans leading-relaxed">
                  Negative inputs accepted without bounds checking, yielding -5.0%.
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-[#121214] rounded-xl border border-[#E4E4E7] dark:border-[#27272A] shadow-sm">
                <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5" />
                  Synthesized Minimal Patch:
                </div>
                <pre className="text-[11px] text-[#09090B] dark:text-[#FAFAFA] overflow-x-auto leading-relaxed p-2.5 bg-[#FAFAFA] dark:bg-[#18181B] rounded-lg">
{`+ if not (0.0 <= marks <= total):
+     raise ValueError("Invalid score")`}
                </pre>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#71717A]">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Supabase PostgreSQL authentication &amp; RLS</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Multi-language AST &amp; runtime verification</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Dual sandboxed reproduction ladder</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E4E4E7] dark:border-[#27272A] text-[11px] text-[#A1A1AA]">
            AutoPatch is an autonomous bug detection, reproduction &amp; repair platform.
          </div>
        </div>

        {/* Right: Production Authentication Portal */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Top Navigation & Theme Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="md:hidden flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-bold text-base text-[#09090B] dark:text-[#FAFAFA]">
                  AutoPatch
                </span>
              </div>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
                {tab === "signin" ? "Welcome back" : tab === "otp" ? "Sign in with OTP" : "Create an account"}
              </h1>
              <p className="text-xs text-[#71717A] mt-1.5">
                {tab === "signin" 
                  ? "Enter your credentials to access your autonomous repair workspace." 
                  : tab === "otp"
                  ? "Receive a verification code to sign in securely without a password."
                  : "Start diagnosing and repairing software defects in seconds."}
              </p>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-2.5 mb-5">
              <button
                type="button"
                onClick={handleGoogleOAuth}
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                {loading && requestInFlight.current ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#14B8A6]" />
                    Connecting with Google...
                  </span>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGitHubOAuth}
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                <svg className="w-4 h-4 mr-2.5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4E4E7] dark:border-[#27272A]" />
              </div>
              <div className="relative flex justify-center text-[11px] font-mono uppercase tracking-wider">
                <span className="bg-white dark:bg-[#121214] px-3 text-[#A1A1AA]">
                  or continue with
                </span>
              </div>
            </div>

            {/* 3 Tabs: Password / OTP Code / Register */}
            <div className="flex items-center p-1 bg-[#F4F4F5] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-white dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] shadow-sm"
                    : "text-[#71717A] hover:text-[#09090B]"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => { setTab("otp"); setError(null); setSuccessMessage(null); setOtpStep("request"); setSentToInbox(false); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "otp"
                    ? "bg-white dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] shadow-sm"
                    : "text-[#71717A] hover:text-[#09090B]"
                }`}
              >
                OTP Code
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signup"
                    ? "bg-white dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] shadow-sm"
                    : "text-[#71717A] hover:text-[#09090B]"
                }`}
              >
                Register
              </button>
            </div>

            {/* Success Message Banner */}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Tab 1: Password Sign In */}
            {tab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      maxLength={254}
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signin-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                      Password
                    </label>
                    <Link
                      href={`/auth/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                      className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      maxLength={128}
                      disabled={loading}
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-[#FAFAFA]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#E4E4E7] dark:border-[#27272A] text-[#0F766E] focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="text-[11px] text-[#71717A] cursor-pointer select-none">
                    Remember me on this device
                  </label>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading} 
                    className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Sign In &amp; Enter Workspace <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Tab 2: Real Supabase OTP Login */}
            {tab === "otp" && (
              <div>
                {otpStep === "request" ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label htmlFor="otp-email" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                        Email Address for Verification
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                        <input
                          id="otp-email"
                          type="email"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="name@company.com"
                          maxLength={254}
                          disabled={loading}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-[#71717A] mt-1.5">
                        A real Supabase 6-digit one-time code will be dispatched to your registered email.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading} 
                        className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Sending Code...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            Send Verification Code <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {/* Code Sent Notification Banner */}
                    <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-700 dark:text-blue-400">
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <Mail className="w-4 h-4 text-blue-500" />
                        <span>Verification Code Sent to {otpEmail}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Supabase dispatched your 6-digit verification code to <strong>{otpEmail}</strong>. Please check your inbox (including Spam/Junk) and enter the code below.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="otp-input" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                          Enter Verification Code
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            disabled={loading || resendCooldown > 0}
                            className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            <RefreshCw className="w-3 h-3" />
                            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend code"}
                          </button>
                          <span className="text-[#A1A1AA] text-[10px]">·</span>
                          <button
                            type="button"
                            onClick={() => { setOtpStep("request"); }}
                            className="text-[11px] text-[#71717A] hover:underline flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Change email
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                        <input
                          id="otp-input"
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          disabled={loading}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading} 
                        className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying with Supabase...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            Verify Code &amp; Sign In <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                          </span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Tab 3: Create Account / Real Supabase Registration with Password Criteria */}
            {tab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Harish R K"
                      maxLength={100}
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      maxLength={254}
                      disabled={loading}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signup-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                      Password
                    </label>
                    {password && (
                      <span className={`text-[10px] font-semibold ${
                        passwordCriteriaCount <= 2 ? "text-red-500" : passwordCriteriaCount === 3 ? "text-amber-500" : "text-emerald-500"
                      }`}>
                        {passwordCriteriaCount <= 2 ? "Weak" : passwordCriteriaCount === 3 ? "Medium" : "Strong"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password"
                      maxLength={128}
                      aria-describedby={passwordCriteriaId}
                      disabled={loading}
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6] disabled:opacity-60"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-[#FAFAFA]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {password && (
                    <div className="w-full bg-[#E4E4E7] dark:bg-[#27272A] h-1 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordCriteriaCount <= 2 
                            ? "w-1/3 bg-red-500" 
                            : passwordCriteriaCount === 3 
                            ? "w-2/3 bg-amber-500" 
                            : "w-full bg-emerald-500"
                        }`}
                      />
                    </div>
                  )}

                  {/* Password Criteria Checklist */}
                  <div id={passwordCriteriaId} className="mt-2.5 p-3 rounded-xl bg-[#F4F4F5]/60 dark:bg-[#18181B]/60 border border-[#E4E4E7] dark:border-[#27272A] space-y-1.5 text-[11px]">
                    <div className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                      Password Requirements:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#71717A]"}`}>
                        {hasMinLength ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] mx-1" />}
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#71717A]"}`}>
                        {hasUpperCase ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] mx-1" />}
                        <span>1 uppercase (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#71717A]"}`}>
                        {hasLowerCase ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] mx-1" />}
                        <span>1 lowercase (a-z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-[#71717A]"}`}>
                        {hasNumberOrSymbol ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] mx-1" />}
                        <span>1 number / symbol</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                        isConfirmValid ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {isConfirmValid ? <Check className="w-3 h-3" /> : null}
                        {isConfirmValid ? "Passwords match" : "Passwords do not match"}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      maxLength={128}
                      aria-describedby={passwordCriteriaId}
                      disabled={loading}
                      className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border ${
                        confirmPassword && !isConfirmValid
                          ? "border-red-500/50 focus:ring-red-500"
                          : "border-[#E4E4E7] dark:border-[#27272A] focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      } text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 disabled:opacity-60`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-[#FAFAFA]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading || !isPasswordValid || !isConfirmValid} 
                    className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Registering in Supabase...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        Create Developer Account <ArrowRight className="w-4 h-4 stroke-[1.75]" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-[#E4E4E7] dark:border-[#27272A] text-center text-[11px] text-[#A1A1AA]">
            By continuing, you agree to AutoPatch&apos;s Terms of Service and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#71717A]">
        Loading authentication portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
