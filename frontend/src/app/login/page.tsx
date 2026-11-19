"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound, 
  UserPlus, 
  Database,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Info,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthManager } from "@/lib/auth";
import { getAuthProvider } from "@/lib/authProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const authProvider = getAuthProvider();
  const isSupabase = authProvider.getMode() === "supabase";

  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [oauthModalProvider, setOauthModalProvider] = useState<"google" | "github" | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const supabaseCallbackUrl = "https://qqgwmkqfdoayiblculhf.supabase.co/auth/v1/callback";
  const supabaseProvidersUrl = "https://supabase.com/dashboard/project/qqgwmkqfdoayiblculhf/auth/providers";

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(supabaseCallbackUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSupabase) {
        const res = await authProvider.signIn(email, password);
        if (res.user) {
          router.push(redirectUrl);
        } else {
          setError(res.error || "Authentication failed. Please verify your email and password.");
        }
      } else {
        const user = AuthManager.signIn(email, password);
        if (user) {
          router.push(redirectUrl);
        } else {
          setError("Invalid credentials. Enter any valid email & 4+ character password.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSupabaseAdminLogin = async () => {
    setEmail("admin@autopatch.dev");
    setPassword("AutoPatch@2026!");
    setError(null);
    setLoading(true);
    try {
      const res = await authProvider.signIn("admin@autopatch.dev", "AutoPatch@2026!");
      if (res.user) {
        router.push(redirectUrl);
      } else {
        setError(res.error || "Failed to sign in with admin account.");
      }
    } catch (err: any) {
      setError(err?.message || "Admin login failed.");
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
      if (isSupabase) {
        const res = await authProvider.signUp(fullName, email, password);
        if (res.user) {
          router.push(redirectUrl);
        } else {
          setError(res.error || "Sign up failed. Please check your credentials.");
        }
      } else {
        const user = AuthManager.signUp(fullName, email, password);
        if (user) {
          router.push(redirectUrl);
        } else {
          setError("Please provide a valid email and password.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);

    try {
      const res = await authProvider.signInWithOAuth(provider);
      if (res.error) {
        if (res.error.startsWith("PROVIDER_DISABLED:")) {
          setOauthModalProvider(provider);
        } else {
          setError(res.error);
        }
        setOauthLoading(null);
      } else if (res.user) {
        router.push(redirectUrl);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to initiate ${provider} sign-in.`);
      setOauthLoading(null);
    }
  };

  const handleDemoLogin = () => {
    AuthManager.loginDemo();
    router.push(redirectUrl);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      {/* OAuth Setup Guidance Modal */}
      {oauthModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-2xl shadow-2xl overflow-hidden p-6 relative">
            <button
              onClick={() => setOauthModalProvider(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#78716C] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] hover:bg-[#FAF9F6] dark:hover:bg-[#23201D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 text-[#D97706] dark:text-[#F59E0B] flex items-center justify-center border border-[#F59E0B]/20">
                <AlertTriangle className="w-5 h-5 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                  {oauthModalProvider === "google" ? "Google" : "GitHub"} Sign-In Needs Activation
                </h3>
                <p className="text-xs text-[#78716C]">
                  Supabase Project: <code className="font-mono text-[#0F766E] dark:text-[#14B8A6]">qqgwmkqfdoayiblculhf</code>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mb-4 leading-relaxed">
              In Supabase, third-party authentication providers are disabled by default until you enable them with your Google Cloud OAuth Client ID &amp; Secret.
            </p>

            <div className="space-y-3 bg-[#FAF9F6] dark:bg-[#1C1917] p-4 rounded-xl border border-[#E7E5E4] dark:border-[#292524] text-xs font-sans mb-5">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div>
                  <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Open Supabase Dashboard:</span>
                  <a
                    href={supabaseProvidersUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#0F766E] dark:text-[#14B8A6] font-medium hover:underline mt-0.5"
                  >
                    <span>Supabase Authentication Providers</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div>
                  <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Enable Google Provider:</span>
                  <p className="text-[11px] text-[#78716C] mt-0.5">Toggle &quot;Enable Google&quot; and paste your Google Cloud Client ID &amp; Secret.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F766E]/15 text-[#0F766E] dark:text-[#14B8A6] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <div className="w-full">
                  <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Authorized Redirect URI (Google Console):</span>
                  <div className="flex items-center justify-between mt-1 p-2 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg">
                    <span className="font-mono text-[10px] text-[#0F766E] dark:text-[#14B8A6] truncate mr-2">
                      {supabaseCallbackUrl}
                    </span>
                    <button
                      type="button"
                      onClick={copyCallbackUrl}
                      className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] flex-shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={() => {
                  setOauthModalProvider(null);
                  handleQuickSupabaseAdminLogin();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold shadow-sm justify-center"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                Quick Sign In with Active Supabase Account (admin@autopatch.dev)
              </Button>

              <button
                type="button"
                onClick={() => {
                  setOauthModalProvider(null);
                  setTab("signup");
                }}
                className="w-full py-2 rounded-xl text-xs text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] hover:bg-[#FAF9F6] dark:hover:bg-[#23201D] font-medium transition-colors"
              >
                Or Create a New Account with Email &amp; Password
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white/95 dark:bg-[#141210]/95 backdrop-blur-md border border-[#E7E5E4] dark:border-[#292524] rounded-2xl overflow-hidden shadow-xl">
        {/* Left: Sign-In / Sign-Up Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header: Logo & Theme */}
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09] shadow-sm">
                  <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
                </div>
                <span className="font-bold text-lg tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
                  AutoPatch
                </span>
              </Link>

              <div className="flex items-center gap-2">
                {isSupabase ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/30 font-semibold flex items-center gap-1">
                    <Database className="w-3 h-3" /> Supabase Live Auth
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#D97706]/10 text-[#D97706] dark:text-[#F59E0B] border border-[#D97706]/30 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Demo Auth
                  </span>
                )}
                <ThemeToggle />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
                {tab === "signin" ? "Welcome Back to AutoPatch" : "Create Your Developer Account"}
              </h1>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-1">
                {tab === "signin" 
                  ? "Sign in to access your autonomous bug reproduction & repair workspace." 
                  : "Start reproducing and repairing bugs with concrete test evidence in seconds."}
              </p>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={loading || Boolean(oauthLoading)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#1C1917] hover:bg-[#FAF9F6] dark:hover:bg-[#23201D] text-[#1C1917] dark:text-[#F5F5F4] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#14B8A6] mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth("github")}
                disabled={loading || Boolean(oauthLoading)}
                className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#1C1917] hover:bg-[#FAF9F6] dark:hover:bg-[#23201D] text-[#1C1917] dark:text-[#F5F5F4] text-xs font-semibold shadow-sm transition-all duration-150 disabled:opacity-60"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#14B8A6] mr-2" />
                ) : (
                  <svg className="w-4 h-4 mr-2.5 flex-shrink-0 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                )}
                <span>Continue with GitHub</span>
              </button>
            </div>

            {isSupabase && (
              <p className="text-[10px] text-center text-[#78716C] mb-4 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                OAuth requires enabling the provider in your Supabase project dashboard.
              </p>
            )}

            {/* Quick 1-Click Supabase Admin Login Card */}
            {isSupabase && (
              <div className="mb-5 p-3 rounded-xl bg-[#0F766E]/5 border border-[#0F766E]/20 flex items-center justify-between">
                <div className="text-[11px]">
                  <div className="font-semibold text-[#0F766E] dark:text-[#14B8A6] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Live Supabase Account Ready
                  </div>
                  <div className="text-[#78716C] text-[10px] mt-0.5 font-mono">
                    admin@autopatch.dev
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={handleQuickSupabaseAdminLogin}
                  className="text-xs py-1.5 px-3 rounded-lg border-[#0F766E]/30 text-[#0F766E] dark:text-[#14B8A6] hover:bg-[#0F766E]/10"
                >
                  <KeyRound className="w-3 h-3 mr-1" />
                  1-Click Sign In
                </Button>
              </div>
            )}

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E7E5E4] dark:border-[#292524]" />
              </div>
              <div className="relative flex justify-center text-[11px] font-mono uppercase tracking-wider">
                <span className="bg-white dark:bg-[#141210] px-3 text-[#78716C]">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Auth Mode Tabs (Sign In / Create Account) */}
            <div className="flex items-center p-1 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-xl mb-5">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signin"
                    ? "bg-white dark:bg-[#292524] text-[#1C1917] dark:text-[#F5F5F4] shadow-sm"
                    : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === "signup"
                    ? "bg-white dark:bg-[#292524] text-[#1C1917] dark:text-[#F5F5F4] shadow-sm"
                    : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-xs text-[#DC2626] dark:text-[#F87171] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Sign In Form */}
            {tab === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="signin-password" className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#78716C] hover:text-[#1C1917]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center">
                    {loading ? (isSupabase ? "Authenticating with Supabase..." : "Signing In...") : "Sign In & Enter Workspace"}
                    {!loading && <ArrowRight className="w-4 h-4 ml-1.5 stroke-[1.5]" />}
                  </Button>

                  {!isSupabase && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDemoLogin}
                      className="w-full py-2 rounded-xl text-[#0F766E] dark:text-[#14B8A6] border-[#0F766E]/30 font-medium justify-center"
                    >
                      <KeyRound className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                      Quick 1-Click Demo Login
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              /* Create Account / Register Form */
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1.5">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#78716C] absolute left-3 top-2.5" />
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#78716C] hover:text-[#1C1917]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" disabled={loading} className="w-full py-2.5 rounded-xl font-semibold shadow-sm justify-center">
                  <UserPlus className="w-4 h-4 mr-1.5 stroke-[1.5]" />
                  {loading ? (isSupabase ? "Registering in Supabase..." : "Creating Account...") : "Create Developer Account & Continue"}
                </Button>
              </form>
            )}
          </div>

          {/* Bottom Security Note */}
          {isSupabase ? (
            <div className="mt-8 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
              <div className="flex items-center gap-1.5 font-semibold text-[#0F766E] dark:text-[#14B8A6] mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>Supabase PostgreSQL Auth Connected</span>
              </div>
              <p className="leading-relaxed">
                Database URI: <code className="text-[#1C1917] dark:text-[#F5F5F4]">aws-1-ap-northeast-1.pooler.supabase.com</code>
              </p>
            </div>
          ) : (
            <div className="mt-8 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
              <p className="font-semibold text-[#B45309] dark:text-[#FBBF24] mb-1">Demo Credentials Available:</p>
              <p>Email: <code className="text-[#1C1917] dark:text-[#F5F5F4]">demo@autopatch.dev</code> · Password: <code className="text-[#1C1917] dark:text-[#F5F5F4]">Demo@1234</code></p>
            </div>
          )}
        </div>

        {/* Right: Live Interactive Mini-Example & Benefits */}
        <div className="bg-[#FAF9F6]/80 dark:bg-[#1C1917]/80 p-8 sm:p-10 border-t md:border-t-0 md:border-l border-[#E7E5E4] dark:border-[#292524] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5 font-sans text-sm">
                <Sparkles className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                AutoPatch Verification Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] border border-[#10B981]/30 font-bold">
                V4 Proven
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-[#141210] rounded-xl border border-[#E7E5E4] dark:border-[#292524] shadow-sm">
                <div className="flex items-center gap-1.5 text-[#B91C1C] dark:text-[#F87171] mb-1.5 font-semibold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5]" />
                  Defect: calculate_percentage(-5, 100)
                </div>
                <div className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] font-sans leading-relaxed">
                  Negative marks accepted without bounds validation, yielding -5.0%.
                </div>
              </div>

              <div className="p-4 bg-white dark:bg-[#141210] rounded-xl border border-[#E7E5E4] dark:border-[#292524] shadow-sm">
                <div className="text-xs font-semibold text-[#047857] dark:text-[#34D399] mb-1.5">
                  Synthesized Minimal Patch:
                </div>
                <pre className="text-[11px] text-[#1C1917] dark:text-[#F5F5F4] overflow-x-auto leading-relaxed p-2.5 bg-[#FAF9F6] dark:bg-[#1C1917] rounded-lg">
{`+ if not (0.0 <= marks <= total):
+     raise ValueError("Invalid score")`}
                </pre>
              </div>

              <div className="space-y-2 pt-2 text-[11px] text-[#57534E] dark:text-[#D6D3D1] font-sans">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  <span>Dual sandboxed reproduction before &amp; after fix</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  <span>Multi-language AST &amp; runtime parsing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                  <span>Strict zero-hallucination verification ladder</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[#E7E5E4] dark:border-[#292524] text-[11px] text-[#78716C] font-sans">
            Need assistance? AutoPatch Voice AI agent is ready to dial your number and explain root causes directly.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#57534E]">
        Loading authentication portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
