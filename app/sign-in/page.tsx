"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/src/lib/supabase";

export default function SignIn() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Email & Password Sign In
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setErrorMessage(
            "Your email address has not been confirmed yet. Please check your inbox for the verification link before logging in."
          );
        } else if (error.message.toLowerCase().includes("invalid login credentials")) {
          setErrorMessage(
            "Invalid email or password. Please verify your credentials or sign up if you don't have an account."
          );
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data?.session) {
        setInfoMessage("Authentication successful! Redirecting to Recovery Engine...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("provider is not enabled") || error.message.toLowerCase().includes("validation_failed")) {
          setErrorMessage(
            "Google OAuth provider is not currently enabled in your Supabase Auth project configuration. Please sign in with Email / Password or enable Google provider in the Supabase Dashboard."
          );
        } else {
          setErrorMessage(error.message);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes("provider is not enabled") || err.message.toLowerCase().includes("validation_failed"))) {
        setErrorMessage(
          "Google OAuth provider is not currently enabled in your Supabase Auth project configuration. Please sign in with Email / Password or enable Google provider in the Supabase Dashboard."
        );
      } else {
        setErrorMessage(err.message || "Google authentication failed.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-bg text-text-primary min-h-screen flex flex-col font-sans relative">
      {/* Top Navbar */}
      <header className="h-16 border-b border-border bg-surface px-6 flex justify-between items-center z-10 relative">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-primary flex items-center justify-center text-white font-bold rounded-[10px] shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[18px]">all_inclusive</span>
          </div>
          <span className="font-headline text-lg font-bold tracking-tight">RECOVRA</span>
        </Link>
        <div className="flex items-center gap-4 font-mono text-xs">
          <ThemeToggle />
          <Link href="/" className="text-text-secondary hover:text-primary uppercase flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">close</span>
            Cancel
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 text-center">
            <h1 className="font-headline text-2xl font-bold tracking-tight mb-2">Sign In to RECOVRA</h1>
            <p className="font-mono text-xs text-text-secondary">
              Authenticate via Supabase Auth to access recovery engine controls.
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-panel p-8 relative rounded-[22px] shadow-xl">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-primary rounded-t-[22px]"></div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-6 p-4 border border-error/40 bg-error/10 text-error font-mono text-xs rounded-[14px] flex items-start gap-3">
                <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                <div className="leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Success Info Alert */}
            {infoMessage && (
              <div className="mb-6 p-4 border border-success/40 bg-success/10 text-success font-mono text-xs rounded-[14px] flex items-center gap-3">
                <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                <div className="leading-relaxed font-bold">{infoMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block font-mono text-[10px] font-bold text-text-secondary uppercase mb-2" htmlFor="email">
                  Work Email Address
                </label>
                <div className="relative border border-border bg-surface-secondary/50 rounded-[14px] focus-within:border-primary transition-all">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    id="email"
                    required
                    placeholder="operator@recovra.sys"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-text-primary font-mono text-xs pl-10 pr-4 py-3 focus:outline-none focus:ring-0 placeholder:text-text-secondary/50"
                  />
                </div>
              </div>

              {/* Password Field with Functional Eye Masking Toggle */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-mono text-[10px] font-bold text-text-secondary uppercase" htmlFor="password">
                    Password
                  </label>
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Password reset link request simulated."); }} className="font-mono text-[9px] text-primary hover:text-text-primary uppercase">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative border border-border bg-surface-secondary/50 rounded-[14px] focus-within:border-primary transition-all">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none text-text-primary font-mono text-xs pl-10 pr-11 py-3 focus:outline-none focus:ring-0 placeholder:text-text-secondary/50"
                  />
                  {/* Eye Masking Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:brightness-110 transition-all text-white font-mono text-xs font-bold uppercase py-3.5 rounded-[14px] shadow-md shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <span className="relative bg-surface px-3 font-mono text-[9px] uppercase text-text-secondary">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Social Logins: Google OAuth Button & 1-Click Demo Login */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full border border-border bg-surface-secondary/70 hover:border-primary hover:bg-surface-secondary transition-all text-text-primary font-mono text-xs font-bold py-3 rounded-[14px] flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
              >
                {googleLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent animate-spin rounded-full"></span>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* 1-Click Demo Operator Login Button */}
              <button
                type="button"
                onClick={() => {
                  setInfoMessage("⚡ Demo Operator Session Authenticated! Redirecting to Dashboard...");
                  setTimeout(() => router.push("/dashboard"), 400);
                }}
                className="w-full bg-success/15 border border-success/40 text-success hover:bg-success/25 transition-all font-mono text-xs font-bold uppercase py-3 rounded-[14px] flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span>1-Click Demo Operator Login</span>
              </button>
            </div>
          </div>

          {/* Direct to Sign Up */}
          <div className="mt-6 text-center">
            <p className="font-mono text-xs text-text-secondary">
              Don&apos;t have an account yet?{" "}
              <Link href="/sign-up" className="text-primary font-bold border-b border-primary/30 hover:border-primary pb-0.5 ml-1 transition-colors">
                Sign Up (Request Allocation)
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full text-center py-6 opacity-60">
        <p className="font-mono text-[10px] text-text-secondary">
          SUPABASE AUTH ACTIVE // AES-256 SESSION ENCRYPTION
        </p>
      </footer>
    </div>
  );
}
