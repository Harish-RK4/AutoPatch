"use client";

import React, { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  Loader2, 
  RotateCcw,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";

  const [step, setStep] = useState<"request" | "reset">(codeParam ? "reset" : "request");
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(codeParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Prevent duplicate submissions
  const isSubmittingRef = useRef(false);

  // Password criteria (matches registration policy)
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword);
  const passwordCriteriaCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumberOrSymbol].filter(Boolean).length;
  const isPasswordValid = passwordCriteriaCount === 4;
  const isConfirmValid = Boolean(confirmPassword) && newPassword === confirmPassword;

  // Step 1: Request Password Reset Code
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setError("Please provide a valid email address.");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset code. Please try again.");
      } else {
        setStep("reset");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to request password reset.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Step 2: Set New Password with Code
  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError("Please enter the verification code.");
      return;
    }
    if (!isPasswordValid) {
      setError("Password must meet all 4 security criteria.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          email: cleanEmail,
          otp: cleanOtp,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update password. Please check the code.");
      } else {
        setSuccessMessage("Your password has been successfully reset! You can now sign in with your new password.");
      }
    } catch (err: any) {
      setError(err?.message || "Password reset failed. Please try again.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
              <ShieldCheck className="w-5 h-5 stroke-[1.75]" />
            </div>
            <span className="font-bold text-base text-[#09090B] dark:text-[#FAFAFA]">
              AutoPatch
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-[#09090B] dark:text-[#FAFAFA]">
            Reset Your Password
          </h1>
          <p className="text-xs text-[#71717A] mt-1.5 leading-relaxed">
            {step === "request" 
              ? "Enter your registered email address to receive secure recovery instructions." 
              : "Enter your verification code and choose a new secure password."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">Password Reset Complete</div>
                <p className="leading-relaxed">{successMessage}</p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => router.push("/login")}
              className="w-full py-2.5 rounded-xl text-xs font-semibold justify-center"
            >
              Sign In with New Password <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        ) : step === "request" ? (
          /* Step 1: Request Code */
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  maxLength={254}
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] disabled:opacity-60"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-semibold justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Code...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Send Recovery Code <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-[#0F766E] dark:text-[#14B8A6] hover:underline font-medium">
                Back to Sign In
              </Link>
            </div>
          </form>
        ) : (
          /* Step 2: Set New Password */
          <form onSubmit={handlePerformReset} className="space-y-4">
            <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-700 dark:text-blue-400">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>Verification Code Sent</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Supabase sent a recovery code to <strong>{email}</strong>. Check your inbox and enter the code below.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reset-code" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                  Recovery Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Change email
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                <input
                  id="reset-code"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={10}
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0F766E] disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="new-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                  New Password
                </label>
                {newPassword && (
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
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  maxLength={128}
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#A1A1AA] hover:text-[#09090B] dark:hover:text-[#FAFAFA]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {newPassword && (
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
              <div className="mt-2.5 p-3 rounded-xl bg-[#F4F4F5]/60 dark:bg-[#18181B]/60 border border-[#E4E4E7] dark:border-[#27272A] space-y-1.5 text-[11px]">
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                  Confirm New Password
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
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  maxLength={128}
                  required
                  disabled={loading}
                  className={`w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border ${
                    confirmPassword && !isConfirmValid
                      ? "border-red-500/50 focus:ring-red-500"
                      : "border-[#E4E4E7] dark:border-[#27272A] focus:ring-[#0F766E]"
                  } text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 disabled:opacity-60`}
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

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !isPasswordValid || !isConfirmValid}
              className="w-full py-2.5 rounded-xl text-xs font-semibold justify-center disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Update Password &amp; Continue <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#71717A]">
          Loading password reset portal...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
