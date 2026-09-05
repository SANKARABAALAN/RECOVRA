"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface LiveDemoStep {
  id: number;
  title: string;
  stage: string;
  description: string;
  payload: string;
  route?: string;
  durationMs: number;
}

const DEMO_STEPS: LiveDemoStep[] = [
  {
    id: 1,
    title: "1-Click Demo Dataset Seeding",
    stage: "SEED_DATASET",
    description: "Populating Supabase database with 100 realistic payments, recovery cases, AI diagnoses, and audit logs.",
    payload: "POST /api/demo/seed -> 100 records generated across 6 merchant categories",
    route: "/dashboard",
    durationMs: 8000,
  },
  {
    id: 2,
    title: "Failed Payment Event Intercepted",
    stage: "PAYMENT_FAILED",
    description: "Razorpay Checkout webhook receives payment failure due to NPCI UPI network timeout.",
    payload: 'order_id: "ord_live_demo_9921", amount: ₹14,999, method: "UPI", status: "Failed"',
    route: "/dashboard",
    durationMs: 7000,
  },
  {
    id: 3,
    title: "Recovery Case Instantiated",
    stage: "DETECTED",
    description: "RECOVRA Recovery Engine captures transaction failure and initializes case in DETECTED stage.",
    payload: 'case_id: "rec_live_demo_01", stage: "DETECTED", recovery_status: "Detected"',
    route: "/recovery",
    durationMs: 8000,
  },
  {
    id: 4,
    title: "Gemini AI Diagnostic Analysis",
    stage: "DIAGNOSING",
    description: "AI Diagnostic Engine analyzes gateway failure logs and assigns 94% confidence score.",
    payload: 'root_cause: "BANK_NETWORK", confidence: 94%, recommendation: "WAIT_AND_RETRY"',
    route: "/recovery",
    durationMs: 8000,
  },
  {
    id: 5,
    title: "Safety Policy Gate Evaluation",
    stage: "POLICY_APPROVED",
    description: "Safety Policy Engine validates retry threshold, transaction limit, and compliance guardrails.",
    payload: 'policy_result: "APPROVED", retry_count: 0, reason: "Passed all 4 safety guardrail checks"',
    route: "/audit",
    durationMs: 7000,
  },
  {
    id: 6,
    title: "AI Negotiator Conversational Outreach",
    stage: "NEGOTIATING",
    description: "AI Negotiator engages customer via chat and processes commitment message.",
    payload: 'customer: "I am traveling today, will pay tomorrow morning." -> intent: "PROMISE_TO_PAY"',
    route: "/negotiator",
    durationMs: 10000,
  },
  {
    id: 7,
    title: "Promise-To-Pay Scheduling",
    stage: "PROMISE_REGISTERED",
    description: "Promise-To-Pay Tracker registers commitment date and pauses automated retries.",
    payload: 'promised_date: "2026-09-05T09:00:00Z", status: "ACTIVE", hold_retries: true',
    route: "/negotiator",
    durationMs: 8000,
  },
  {
    id: 8,
    title: "Autonomous Recovery Worker Execution",
    stage: "RECOVERY_WORKER",
    description: "Autonomous Retry Worker executes scheduled gateway retry via Razorpay routing adapter.",
    payload: 'worker_action: "EXECUTE_RETRY", gateway_token: "rzp_sim_token_9981"',
    route: "/admin",
    durationMs: 8000,
  },
  {
    id: 9,
    title: "Payment Recovery Verified",
    stage: "RECOVERED",
    description: "Verification Service confirms Razorpay settlement authorization and closes case as RECOVERED.",
    payload: 'status: "RECOVERED", settlement_id: "set_live_demo_101", revenue_recovered: ₹14,999',
    route: "/recovery",
    durationMs: 8000,
  },
  {
    id: 10,
    title: "Merchant Intelligence & Audit Refresh",
    stage: "COMPLETE",
    description: "Dashboard KPIs animate count-ups, intelligence funnel updates, and audit stream completes.",
    payload: "revenue_recovered: +₹14,999 | success_rate: 88.4% | total_audits: 14",
    route: "/analytics",
    durationMs: 9000,
  },
];

export default function LiveDemoPlayer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = DEMO_STEPS[currentStepIndex];

  // Execute actual API calls during specific steps
  const executeStepActions = async (stepIndex: number) => {
    try {
      if (stepIndex === 0) {
        // Step 1: Seed
        await fetch("/api/demo/seed", { method: "POST" });
      } else if (stepIndex === 7) {
        // Step 8: Worker
        await fetch("/api/recovery/worker", { method: "POST" });
      }
    } catch (e) {
      console.warn("LiveDemo step execution error:", e);
    }
  };

  useEffect(() => {
    if (!isPlaying || !isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const duration = currentStep.durationMs;
    const intervalMs = 100;
    let elapsed = 0;

    executeStepActions(currentStepIndex);

    if (currentStep.route) {
      router.push(currentStep.route);
    }

    timerRef.current = setInterval(() => {
      elapsed += intervalMs;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        if (currentStepIndex < DEMO_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
          setProgress(0);
        } else {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, isOpen]);

  const handleStart = () => {
    setIsOpen(true);
    setCurrentStepIndex(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handlePauseToggle = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setProgress(0);
  };

  const handleClose = () => {
    setIsPlaying(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button in Top Header */}
      <button
        onClick={handleStart}
        className="bg-primary text-white font-mono text-xs font-bold uppercase px-4 py-2 rounded-[14px] shadow-lg shadow-primary/30 hover:brightness-110 transition-all flex items-center gap-2 border-none hover:-translate-y-0.5"
        title="Launch 90-second automated interactive Judge Demo Showcase"
      >
        <span className="material-symbols-outlined text-[16px] animate-pulse">play_circle</span>
        <span>Start Live Demo</span>
      </button>

      {/* Floating Demo Player Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-lg glass-panel p-5 rounded-[26px] shadow-2xl border border-primary/40 bg-surface/95 backdrop-blur-xl font-mono text-xs animate-in fade-in slide-in-from-bottom-5">
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping"></span>
              <span className="font-bold text-text-primary uppercase tracking-wider text-xs">
                RECOVRA Showcase // Step {currentStep.id} of {DEMO_STEPS.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseToggle}
                className="px-2.5 py-1 bg-surface-secondary border border-border text-text-primary rounded-[10px] hover:border-primary transition-colors flex items-center gap-1 text-[10px]"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {isPlaying ? "pause" : "play_arrow"}
                </span>
                <span>{isPlaying ? "Pause" : "Resume"}</span>
              </button>

              <button
                onClick={handleReset}
                className="px-2.5 py-1 bg-surface-secondary border border-border text-text-secondary rounded-[10px] hover:text-text-primary transition-colors text-[10px]"
                title="Restart Showcase"
              >
                <span className="material-symbols-outlined text-[14px]">replay</span>
              </button>

              <button
                onClick={handleClose}
                className="p-1 text-text-secondary hover:text-text-primary rounded-full hover:bg-surface-secondary"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Active Step Information Card */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-sm text-text-primary">{currentStep.title}</h4>
              <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase rounded-full">
                {currentStep.stage}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">{currentStep.description}</p>
            <div className="p-2.5 bg-surface-secondary/70 border border-border/80 rounded-[12px] text-[10px] font-mono text-primary truncate">
              {currentStep.payload}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface-secondary h-2 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary transition-all duration-100 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Step Timeline Indicator Dots */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/60">
            {DEMO_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  setProgress(0);
                }}
                className={`h-2 rounded-full transition-all flex-1 ${
                  idx === currentStepIndex
                    ? "bg-primary shadow-sm shadow-primary/50"
                    : idx < currentStepIndex
                    ? "bg-success"
                    : "bg-surface-secondary"
                }`}
                title={`Step ${step.id}: ${step.title}`}
              ></button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
