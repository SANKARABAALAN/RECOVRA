"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

// Dynamically import ThreeDLoop to bypass SSR errors
const ThreeDLoop = dynamic(() => import("@/components/ThreeDLoop"), { ssr: false });

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(4); // Default to Step 5 (index 4) 'Negotiate'

  const steps = [
    {
      num: "01",
      title: "Detect",
      desc: "Platform monitors transactions in real-time, catching card soft declines and network webhooks instantly.",
    },
    {
      num: "02",
      title: "Diagnose",
      desc: "Examines failure codes, card issuing BIN details, and merchant transaction history to isolate root causes.",
    },
    {
      num: "03",
      title: "Evaluate",
      desc: "Calculates the probability of recovery and weights costs against communication methods to maximize efficiency.",
    },
    {
      num: "04",
      title: "Decide",
      desc: "Applies rigid deterministic safety rules to verify if automated retries or direct customer messaging is compliant.",
    },
    {
      num: "05",
      title: "Negotiate",
      desc: "Our AI Engine initiates a secure conversation, offering payment retries, alternative methods, or payment scheduling.",
      isSpecial: true,
    },
    {
      num: "06",
      title: "Recover",
      desc: "Executes the payment request, updating ledger states and verifying funding availability in real-time.",
    },
    {
      num: "07",
      title: "Verify",
      desc: "Performs strict double-entry ledger audits and cross-verifies gateway transaction tokens with bank providers.",
    },
    {
      num: "08",
      title: "Audit",
      desc: "Updates compliance logs, saves full execution transcripts, and updates models via safety reinforcement learning.",
    },
  ];

  return (
    <div className="bg-bg text-text-primary min-h-screen font-sans">
      <Navbar />

      {/* Hero Section with Centered Text, Wave Background Image & Background 3D loop */}
      <header className="relative pt-32 pb-32 px-6 overflow-hidden border-b border-border bg-bg/40 min-h-[85vh] flex items-center">
        {/* Full Horizontal Opaque Wave Graphic Background */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none opacity-80">
          <img
            src="/hero-wave-bg.png"
            alt="Hero Flowing Wave Background"
            className="w-full h-full object-cover mix-blend-screen opacity-90"
          />
        </div>

        {/* Background 3D loop animation with domain symbols */}
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none opacity-50 md:opacity-75">
          <ThreeDLoop variant="knot" />
        </div>

        {/* Centered Content */}
        <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
          <div className="inline-block border border-primary/45 px-3.5 py-1 text-primary font-mono text-[10px] font-bold uppercase tracking-widest mb-6 bg-surface/60 backdrop-blur-md rounded-full shadow-sm shadow-primary/20">
            RECOVRA Core Engine
          </div>
          <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-none mb-6 drop-shadow-md">
            Recover revenue.
            <br />
            <span className="text-primary drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]">
              Intelligently.
            </span>
          </h1>
          <p className="font-mono text-sm text-text-secondary leading-relaxed mb-8 max-w-xl bg-bg/70 p-3 backdrop-blur-md rounded-xl border border-border/40">
            RECOVRA detects failed payments, diagnoses banking errors, evaluates transaction security, and auto-negotiates recovery with deterministic safety rules.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-in"
              className="bg-primary text-white font-mono text-xs font-bold uppercase px-6 py-4 hover:brightness-110 transition-all flex items-center gap-2 rounded-[16px] shadow-lg shadow-primary/30 hover:-translate-y-0.5"
            >
              Open Recovery Dashboard
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
            <Link
              href="/sign-up"
              className="border border-border bg-surface/60 backdrop-blur-md text-text-primary hover:border-primary hover:text-primary transition-all font-mono text-xs uppercase px-6 py-4 rounded-[16px] shadow-sm"
            >
              Request Access
            </Link>
          </div>
        </div>
      </header>

      {/* Problem Section */}
      <section id="product" className="py-20 px-6 md:px-margin-page max-w-container-max mx-auto border-t border-border">
        <div className="max-w-2xl mb-12">
          <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-widest block mb-2">Failure Classification</span>
          <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight">
            Revenue doesn&apos;t disappear in one single moment.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-panel p-6 flex flex-col gap-4 rounded-[18px]">
            <span className="material-symbols-outlined text-primary text-3xl">schedule</span>
            <h3 className="font-mono text-xs font-bold uppercase text-text-primary tracking-wider">Temporary Failures</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Soft declines caused by gateway timeouts, network delays, or transient bank ledger lockups.
            </p>
            <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-text-secondary font-mono text-xs">
              <span>Avg Recovery</span>
              <span className="text-success font-bold">85%</span>
            </div>
          </div>
          {/* Card 2 */}
          <div className="glass-panel p-6 flex flex-col gap-4 rounded-[18px]">
            <span className="material-symbols-outlined text-warning text-3xl">report</span>
            <h3 className="font-mono text-xs font-bold uppercase text-text-primary tracking-wider">Customer Issues</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Expired credit cards, card updates, or manual account locking by secondary cardholders.
            </p>
            <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-text-secondary font-mono text-xs">
              <span>Avg Recovery</span>
              <span className="text-warning font-bold">62%</span>
            </div>
          </div>
          {/* Card 3 */}
          <div className="glass-panel p-6 flex flex-col gap-4 rounded-[18px]">
            <span className="material-symbols-outlined text-error text-3xl">cancel</span>
            <h3 className="font-mono text-xs font-bold uppercase text-text-primary tracking-wider">Payment Abandonment</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Hard declines, user cancellation intents, or chronic account funding issues.
            </p>
            <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-text-secondary font-mono text-xs">
              <span>Avg Recovery</span>
              <span className="text-error font-bold">15%</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8-Step Recovery Workflow (Timeline) */}
      <section id="workflow" className="py-20 px-6 md:px-margin-page max-w-container-max mx-auto border-t border-border bg-surface-secondary/20">
        <div className="text-center mb-16">
          <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-widest block mb-2">Automated Execution</span>
          <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight">
            Algorithmic Recovery Process
          </h2>
          <p className="text-xs text-text-secondary font-mono mt-2">
            Click any step to inspect the action pipeline
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Interactive Steps List */}
          <div className="lg:col-span-5 space-y-3">
            {steps.map((step, idx) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(idx)}
                className={`w-full text-left p-4 border transition-all flex items-center justify-between rounded-[14px] ${
                  activeStep === idx
                    ? step.isSpecial
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                      : "border-primary bg-surface"
                    : "border-border bg-surface/30 hover:border-text-secondary"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-xs font-bold ${activeStep === idx ? "text-primary" : "text-text-secondary"}`}>
                    {step.num}
                  </span>
                  <span className={`font-headline font-bold text-sm ${activeStep === idx ? "text-text-primary" : "text-text-secondary"}`}>
                    {step.title}
                  </span>
                </div>
                {step.isSpecial && (
                  <span className="font-mono text-[8px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                    AI ENGINE
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Right Column: Dynamic Step Details Panel with Highlight */}
          <div className="lg:col-span-7">
            <div className={`glass-panel p-8 relative overflow-hidden transition-all duration-300 rounded-[20px] ${
              steps[activeStep].isSpecial ? "border-primary shadow-[0_0_25px_rgba(99,102,241,0.2)]" : ""
            }`}>
              {steps[activeStep].isSpecial && (
                <div className="absolute top-0 right-0 bg-primary text-white font-mono text-[9px] font-bold px-3 py-1 tracking-wider uppercase rounded-bl-[12px]">
                  Featured Core Differentiator
                </div>
              )}
              
              <div className="font-mono text-primary text-[10px] font-bold tracking-widest mb-2">
                WORKFLOW PHASE // {steps[activeStep].num}
              </div>
              <h3 className="font-headline text-3xl font-bold mb-4 flex items-center gap-3">
                {steps[activeStep].title}
                {steps[activeStep].isSpecial && (
                  <span className="font-mono text-xs text-primary animate-pulse font-normal border border-primary/30 px-2.5 py-0.5 rounded-full">
                    Live Negotiation Mode
                  </span>
                )}
              </h3>
              <p className="font-mono text-xs text-text-secondary leading-relaxed mb-6">
                {steps[activeStep].desc}
              </p>

              {/* Special Preview Block inside Step 5 Detail */}
              {steps[activeStep].isSpecial ? (
                <div className="border border-primary/30 bg-bg/50 p-4 font-mono text-xs space-y-4 rounded-[14px]">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-[10px] text-text-secondary">AI SIMULATOR SESSION</span>
                    <span className="text-success text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                      ACTIVE
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-text-secondary text-[11px]">&gt; Customer: &quot;I want to pay, but can you run the card tomorrow morning?&quot;</div>
                    <div className="text-primary text-[11px]">&gt; RECOVRA AI: &quot;Understood. We have scheduled the payment retry for tomorrow morning at 09:00 AM.&quot;</div>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between text-[10px] text-text-secondary">
                    <span>INTENT: PAY_TOMORROW</span>
                    <span>SAFETY: APPROVED</span>
                  </div>
                </div>
              ) : (
                <div className="border border-border bg-surface-secondary/40 p-4 font-mono text-[10px] text-text-secondary rounded-[12px]">
                  &gt; SYSTEM STATE: IDLE<br />
                  &gt; INTEGRITY: VERIFIED<br />
                  &gt; AUDIT LOGGED: TRUE
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section id="safety" className="py-20 px-6 md:px-margin-page max-w-container-max mx-auto border-t border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-widest block mb-2">Security Guardrails</span>
            <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight mb-6">
              AI + Deterministic Safety Layer
            </h2>
            <p className="font-mono text-xs text-text-secondary leading-relaxed mb-6">
              We separate logical recovery flows from conversational negotiations. All recovery actions are validated against strict merchant policy criteria. No model hallucinations can bypass the payment limits.
            </p>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-success mt-0.5">verified_user</span>
                <div>
                  <h4 className="font-mono text-xs font-bold text-text-primary uppercase tracking-wide">Hard Stop Overrides</h4>
                  <p className="text-xs text-text-secondary mt-1">If card locks occur or maximum retries are breached, the agent freezes safely for merchant audit.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <span className="material-symbols-outlined text-success mt-0.5">shield</span>
                <div>
                  <h4 className="font-mono text-xs font-bold text-text-primary uppercase tracking-wide">Razorpay Sandbox Validation</h4>
                  <p className="text-xs text-text-secondary mt-1">Operations are staged in Sandbox Test Mode before promotion, keeping payment gateways isolated.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative h-[300px] border border-border bg-surface/30 backdrop-blur-sm p-5 flex flex-col justify-center gap-4 font-mono text-[11px] text-text-secondary rounded-[20px] shadow-lg">
            <div className="absolute top-4 left-4 font-mono text-[10px] text-text-secondary uppercase font-bold">
              Compliance Policy Engine
            </div>
            <div className="border border-border p-4 bg-bg space-y-2 rounded-[14px]">
              <div className="flex justify-between">
                <span>Rule: CHECK_MAX_RETRIES</span>
                <span className="text-success font-bold">PASSED [2/3]</span>
              </div>
              <div className="flex justify-between">
                <span>Rule: CHECK_OUT_OF_BOUNDS_AMOUNT</span>
                <span className="text-success font-bold">PASSED [Within Limit]</span>
              </div>
              <div className="flex justify-between">
                <span>Rule: CUSTOMER_CONSENT_CAPTURED</span>
                <span className="text-success font-bold">PASSED [Wait 24h Request]</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-text-primary">
                <span>POLICY RESOLUTION:</span>
                <span className="bg-success/20 text-success px-2.5 py-0.5 font-bold rounded-full">APPROVED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recovery Negotiator Preview Section */}
      <section id="negotiator-preview" className="py-20 px-6 md:px-margin-page max-w-container-max mx-auto border-t border-border bg-surface-secondary/20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-primary font-mono text-[10px] font-bold uppercase tracking-widest block mb-2">Experience The AI</span>
            <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight">
              Recovery Negotiator Preview
            </h2>
            <p className="text-xs text-text-secondary mt-2">
              Below is a simulated execution of a negotiator dialogue.
            </p>
          </div>

          {/* Negotiator Panel Mockup */}
          <div className="glass-panel overflow-hidden rounded-[24px] shadow-xl">
            <div className="bg-surface-secondary px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-success animate-pulse rounded-full"></div>
                <span className="font-mono text-xs font-bold text-text-primary">NEGOTIATION CONSOLE #RCV-8991</span>
              </div>
              <span className="font-mono text-[9px] bg-primary/20 text-primary border border-primary/45 px-2.5 py-0.5 font-bold rounded-full">
                SIMULATION DATA
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Context Col */}
              <div className="p-6 space-y-4 font-mono text-xs text-text-secondary">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Customer Profile</span>
                  <span className="text-text-primary font-bold">Sarah Jenkins (Acme Retail)</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Gateway Details</span>
                  <span className="text-text-primary">Razorpay // ₹15,400.00</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Detected Error</span>
                  <span className="text-error font-bold">Insufficient Funds (Card)</span>
                </div>
              </div>

              {/* Chat Log Col */}
              <div className="p-6 font-mono text-xs flex flex-col gap-4 min-h-[220px]">
                <div className="self-start bg-surface-secondary text-text-primary p-3 border border-border max-w-[90%] rounded-[14px] rounded-bl-sm shadow-sm">
                  &gt; Customer: &quot;I had to lock my card temporarily. I can run the payment next Tuesday.&quot;
                </div>
                <div className="self-end bg-primary/15 text-text-primary border border-primary/30 p-3 max-w-[90%] rounded-[14px] rounded-br-sm shadow-sm">
                  &gt; RECOVRA AI: &quot;I understand. I have configured our system to wait until next Tuesday. I will notify you before retry.&quot;
                </div>
              </div>

              {/* Resolution States */}
              <div className="p-6 space-y-4 font-mono text-xs text-text-secondary">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Detected Intent</span>
                  <span className="text-text-primary font-bold uppercase bg-warning/10 text-warning border border-warning/30 px-2.5 py-0.5 inline-block rounded-full">
                    PAY_LATER_TUESDAY
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Active Plan</span>
                  <span className="text-text-primary">Hold retry until Tuesday 10:00 AM</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Safety Lock Checks</span>
                  <span className="text-success font-bold">PASSED (Approved)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12 px-6 md:px-margin-page text-text-secondary font-mono text-xs">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-primary flex items-center justify-center text-white font-bold rounded-[8px]">
              <span className="material-symbols-outlined text-[12px]">all_inclusive</span>
            </div>
            <span className="font-headline text-sm font-bold text-text-primary tracking-tight">
              RECOVRA
            </span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">API Docs</a>
          </div>
          <div className="text-[10px]">
            &copy; 2026 RECOVRA Inc. UI Shell Prototype // RAZORPAY TEST MODE
          </div>
        </div>
      </footer>
    </div>
  );
}
