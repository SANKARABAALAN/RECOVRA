"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/src/lib/supabase";

export default function SignUp() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [gateway, setGateway] = useState("Razorpay Test Mode");
  const [threshold, setThreshold] = useState("50000");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Email & Password Sign Up Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please ensure both password fields are identical.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            gateway_mode: gateway,
            safe_threshold: threshold,
          },
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("user already registered") || error.message.toLowerCase().includes("already in use")) {
          setErrorMessage("An account with this email address already exists. Please Sign In instead.");
        } else {
          setErrorMessage(error.message);
        }
        return;
      }

      if (data?.user) {
        if (data.session) {
          // Auto-authenticated without email confirmation requirement
          router.push("/dashboard");
        } else {
          // Email verification link sent
          setVerificationSent(true);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Sign In / Sign Up
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

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center p-6 md:p-margin-page relative z-10">
        <div className="w-full max-w-4xl">
          {/* VERIFICATION SENT UI STATE */}
          {verificationSent ? (
            <div className="glass-panel p-10 max-w-lg mx-auto text-center space-y-6 rounded-[24px] shadow-2xl border-primary/30">
              <div className="w-16 h-16 bg-success/20 text-success border border-success/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-success/20 animate-bounce">
                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
              </div>

              <div>
                <h1 className="font-headline text-2xl font-bold tracking-tight mb-2">Check Your Email</h1>
                <p className="font-mono text-xs text-text-secondary leading-relaxed">
                  We sent a confirmation verification link to:
                  <span className="block font-bold text-text-primary mt-1 text-sm">{email}</span>
                </p>
              </div>

              <div className="p-4 bg-surface-secondary/60 border border-border font-mono text-[11px] text-text-secondary leading-relaxed text-left rounded-[14px]">
                📌 <strong className="text-text-primary">Email Verification Enforced:</strong> Please open your inbox and click the verification link to confirm your account before logging in to the RECOVRA Dashboard.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 font-mono text-xs">
                <Link
                  href="/sign-in"
                  className="flex-1 bg-primary text-white font-bold uppercase py-3.5 rounded-[14px] shadow-md shadow-primary/25 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Sign In</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setVerificationSent(false)}
                  className="border border-border text-text-secondary hover:text-text-primary hover:border-primary py-3.5 px-4 rounded-[14px] transition-all"
                >
                  Edit Email Address
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="font-headline text-2xl font-bold tracking-tight mb-2">Create RECOVRA Account</h1>
                <p className="font-mono text-xs text-text-secondary">
                  Register a unique account via Supabase Auth to deploy automated revenue recovery agents.
                </p>
              </div>

              {/* Sign Up Card */}
              <div className="glass-panel p-8 relative rounded-[22px] shadow-xl">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-primary rounded-t-[22px]"></div>

                {/* Error Banner Alert */}
                {errorMessage && (
                  <div className="mb-6 p-4 border border-error/40 bg-error/10 text-error font-mono text-xs rounded-[14px] flex items-start gap-3">
                    <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">error</span>
                    <div className="leading-relaxed">{errorMessage}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Form sections side-by-side on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Col 1: Account Credentials */}
                    <div className="space-y-4 font-mono text-xs">
                      <h2 className="font-mono text-xs font-bold text-primary uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center text-[10px]">1</span>
                        Account & Credentials
                      </h2>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Jane Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-surface-secondary/50 border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Work Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="jane@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface-secondary/50 border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Password Field with Masking Toggle */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Password</label>
                        <div className="relative border border-border bg-surface-secondary/50 rounded-[12px] focus-within:border-primary">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent border-none text-text-primary px-3.5 pr-11 py-2.5 focus:outline-none focus:ring-0"
                          />
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

                      {/* Confirm Password Field with Masking Toggle */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Confirm Password</label>
                        <div className="relative border border-border bg-surface-secondary/50 rounded-[12px] focus-within:border-primary">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="••••••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-transparent border-none text-text-primary px-3.5 pr-11 py-2.5 focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                            title={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {showConfirmPassword ? "visibility_off" : "visibility"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Merchant Configuration & OAuth */}
                    <div className="space-y-4 font-mono text-xs">
                      <h2 className="font-mono text-xs font-bold text-primary uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-primary/20 text-primary border border-primary/30 rounded-full flex items-center justify-center text-[10px]">2</span>
                        Organization Configuration
                      </h2>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Company Name</label>
                        <input
                          type="text"
                          required
                          placeholder="Acme Retail Inc."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full bg-surface-secondary/50 border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Primary Gateway Mode</label>
                        <select
                          value={gateway}
                          onChange={(e) => setGateway(e.target.value)}
                          className="w-full bg-surface-secondary/50 border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary cursor-pointer"
                        >
                          <option>Razorpay Test Mode</option>
                          <option>Stripe Test Mode</option>
                          <option>Adyen Sandbox Mode</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Safe Recovery Threshold (₹)</label>
                        <input
                          type="number"
                          required
                          placeholder="50000"
                          value={threshold}
                          onChange={(e) => setThreshold(e.target.value)}
                          className="w-full bg-surface-secondary/50 border border-border text-text-primary px-3.5 py-2.5 rounded-[12px] focus:outline-none focus:border-primary"
                        />
                        <span className="text-[9px] text-text-secondary mt-1 block">Max amount auto-processed without manual review</span>
                      </div>

                      {/* Social Login Button & 1-Click Demo Login */}
                      <div className="pt-2 space-y-2">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1.5">Fast Social Registration</label>
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          disabled={googleLoading}
                          className="w-full border border-border bg-surface-secondary/70 hover:border-primary hover:bg-surface-secondary transition-all text-text-primary font-mono text-xs font-bold py-2.5 rounded-[12px] flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
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
                          <span>Sign Up with Google</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => router.push("/dashboard")}
                          className="w-full bg-success/15 border border-success/40 text-success hover:bg-success/25 transition-all font-mono text-xs font-bold uppercase py-2.5 rounded-[12px] flex items-center justify-center gap-2 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[16px]">bolt</span>
                          <span>1-Click Demo Operator Signup</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Complete Onboarding Submit */}
                  <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="font-mono text-[10px] text-text-secondary uppercase">
                      Supabase Auth // Standard Email Verification Enforced
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto bg-primary hover:brightness-110 transition-all text-white font-mono text-xs font-bold uppercase py-3.5 px-8 rounded-[14px] shadow-md shadow-primary/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Sign Up</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Direct to Sign In */}
              <div className="mt-6 text-center">
                <p className="font-mono text-xs text-text-secondary font-bold">
                  Already registered your account?{" "}
                  <Link href="/sign-in" className="text-primary border-b border-primary/30 hover:border-primary pb-0.5 ml-1 transition-colors">
                    Sign In Here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full text-center py-6 opacity-60">
        <p className="font-mono text-[10px] text-text-secondary">
          SUPABASE AUTH SERVICE // ENFORCED UNIQUE ACCOUNT LIFECYCLE
        </p>
      </footer>
    </div>
  );
}
