"use client";

import React, { useState, Suspense } from "react";
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
  X,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAuthProvider } from "@/lib/authProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface GoogleAccount {
  name: string;
  email: string;
  initial: string;
  bgColor: string;
}

const PRESET_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    name: "Harish R K",
    email: "harishrk457@gmail.com",
    initial: "H",
    bgColor: "bg-blue-600",
  },
  {
    name: "rkharish550",
    email: "rkharish550@gmail.com",
    initial: "R",
    bgColor: "bg-emerald-600",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const authProvider = getAuthProvider();

  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google Sign-In Modal States
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authProvider.signIn(email, password);
      if (res.user) {
        router.push(redirectUrl);
      } else {
        setError(res.error || "Invalid email or password. Please check your credentials and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await authProvider.signUp(fullName, email, password);
      if (res.user) {
        router.push(redirectUrl);
      } else {
        setError(res.error || "Registration failed. Please check your information and try again.");
      }
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSelect = async (selectedEmail: string, selectedName?: string) => {
    setGoogleLoading(true);
    setError(null);

    try {
      let res;
      if (authProvider.signInWithGoogle) {
        res = await authProvider.signInWithGoogle(selectedEmail, selectedName);
      } else {
        res = await authProvider.signInWithOAuth("google");
      }

      if (res.user) {
        setShowGoogleModal(false);
        router.push(redirectUrl);
      } else {
        setError(res.error || "Google authentication failed. Please try again.");
        setShowGoogleModal(false);
      }
    } catch (err: any) {
      setError(err?.message || "Google authentication encountered an error.");
      setShowGoogleModal(false);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      // Standard demo/oauth sign in with github
      const res = await authProvider.signInWithOAuth("github");
      if (res.user) {
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err?.message || "GitHub authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      {/* Authentic Google Account Chooser Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => {
                setShowGoogleModal(false);
                setShowCustomGoogleInput(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#71717A] hover:text-[#09090B] dark:hover:text-[#FAFAFA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Google Header */}
            <div className="flex flex-col items-center text-center mb-6 pt-2">
              <svg className="w-8 h-8 mb-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <h3 className="text-base font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                Sign in with Google
              </h3>
              <p className="text-xs text-[#71717A] mt-1">
                Choose an account to continue to <span className="font-medium text-[#09090B] dark:text-[#FAFAFA]">AutoPatch</span>
              </p>
            </div>

            {googleLoading ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-7 h-7 animate-spin text-[#0F766E] dark:text-[#14B8A6]" />
                <p className="text-xs text-[#71717A]">Signing you into AutoPatch...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Saved Accounts */}
                {PRESET_GOOGLE_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleGoogleSelect(account.email, account.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition-all text-left"
                  >
                    <div className={`w-9 h-9 rounded-full ${account.bgColor} text-white font-semibold flex items-center justify-center text-sm flex-shrink-0`}>
                      {account.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] truncate">
                        {account.name}
                      </div>
                      <div className="text-[11px] text-[#71717A] truncate">
                        {account.email}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Custom Google Account Option */}
                {!showCustomGoogleInput ? (
                  <button
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-[#D4D4D8] dark:border-[#3F3F46] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F4F4F5] dark:bg-[#27272A] text-[#71717A] flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-medium text-[#09090B] dark:text-[#FAFAFA]">
                      Use another Google account
                    </div>
                  </button>
                ) : (
                  <div className="pt-2 border-t border-[#E4E4E7] dark:border-[#27272A]">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customGoogleEmail) {
                          handleGoogleSelect(customGoogleEmail);
                        }
                      }}
                      className="space-y-2"
                    >
                      <input
                        type="email"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        placeholder="Enter your Gmail address"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[#F4F4F5] dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        className="w-full py-2 text-xs rounded-xl justify-center font-medium"
                      >
                        Continue with this account
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-[#E4E4E7] dark:border-[#27272A] text-center text-[10px] text-[#A1A1AA]">
              To continue, Google will share your name, email address, and profile picture with AutoPatch.
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#121214] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl overflow-hidden shadow-2xl">
        {/* Left: Interactive Preview & Technical Value */}
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
                <span>Dual sandboxed reproduction before &amp; after fix</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Multi-language AST &amp; runtime parser</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Zero-hallucination verification ladder</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E4E4E7] dark:border-[#27272A] text-[11px] text-[#A1A1AA]">
            AutoPatch is an autonomous bug detection, reproduction &amp; repair platform.
          </div>
        </div>

        {/* Right: Clean Production Authentication Portal */}
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
                {tab === "signin" ? "Welcome back" : "Create an account"}
              </h1>
              <p className="text-xs text-[#71717A] mt-1.5">
                {tab === "signin" 
                  ? "Enter your credentials to access your autonomous repair workspace." 
                  : "Start diagnosing and repairing software defects in seconds."}
              </p>
            </div>

            {/* Prominent Continue with Google Button */}
            <div className="space-y-2.5 mb-5">
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={handleGitHubAuth}
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
                  or continue with email
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center p-1 bg-[#F4F4F5] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-white dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] shadow-sm"
                    : "text-[#71717A] hover:text-[#09090B]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signup"
                    ? "bg-white dark:bg-[#27272A] text-[#09090B] dark:text-[#FAFAFA] shadow-sm"
                    : "text-[#71717A] hover:text-[#09090B]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            {tab === "signin" ? (
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
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signin-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA]">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
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
            ) : (
              /* Create Account / Register Form */
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
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
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
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-[#09090B] dark:text-[#FAFAFA] mb-1.5">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-2.5" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAFAFA] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] text-[#09090B] dark:text-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
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

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading} 
                    className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating Account...
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
