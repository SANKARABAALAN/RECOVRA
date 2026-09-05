"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBadge from "@/components/StatusBadge";
import UserAccountMenu from "@/components/UserAccountMenu";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function CaseDetails() {
  const params = useParams();
  const caseId = params.id ? String(params.id) : "";

  const [recoveryCase, setRecoveryCase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const { isSidebarCollapsed } = useDesignSystem();

  async function fetchCaseDetail() {
    if (!caseId) return;
    try {
      const res = await fetch(`/api/recovery/${caseId}`);
      if (!res.ok) {
        throw new Error("Failed to load recovery case details from database.");
      }
      const data = await res.json();
      setRecoveryCase(data);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCaseDetail();
  }, [caseId]);

  // Handle retry execution scheduling
  const handleRetryExecution = async () => {
    if (!caseId || isRetrying) return;
    setIsRetrying(true);
    try {
      const res = await fetch("/api/recovery/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recovery_case_id: caseId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        const schedTime = result.scheduled_retry_at ? new Date(result.scheduled_retry_at).toLocaleString("en-IN") : "Immediately";
        alert(`🔄 Automated Retry Scheduled Successfully!\n\nCase ID: ${caseId.substring(0, 8)}\nNext Attempt: ${schedTime}\nAttempt Count: #${result.retryCount || 1} of ${result.maxRetries || 4}`);
        fetchCaseDetail();
      } else {
        alert("Retry execution error: " + (result.error || "Failed to schedule retry at gateway."));
      }
    } catch (err: any) {
      alert("Retry execution error: " + err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  // Rendering Loading UI
  if (loading) {
    return (
      <div className="flex bg-bg min-h-screen text-text-primary">
        <Sidebar />
        <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
          <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between">
            <h1 className="font-headline text-lg font-bold text-text-primary">Loading Case Details...</h1>
          </header>
          <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full flex items-center justify-center min-h-[50vh]">
            <div className="font-mono text-xs text-text-secondary animate-pulse">
              RETRIEVING NEURAL SETTLEMENT LOGS FROM SUPABASE...
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Rendering Error UI
  if (error || !recoveryCase) {
    return (
      <div className="flex bg-bg min-h-screen text-text-primary">
        <Sidebar />
        <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
          <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between">
            <h1 className="font-headline text-lg font-bold text-text-primary">Case Detail Error</h1>
          </header>
          <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full flex items-center justify-center min-h-[50vh]">
            <div className="border border-error/30 bg-error/10 text-error p-6 max-w-md text-center font-mono text-xs rounded-[18px]">
              <span className="material-symbols-outlined text-3xl mb-2 text-error">error</span>
              <p className="font-bold">Error Loading Case</p>
              <p className="mt-2 text-text-secondary">{error || "Case details not found."}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Map database stage to UI pipeline sequence
  const pipelineOrder = ["DETECTED", "DIAGNOSING", "EVALUATING", "ACTION_SELECTED", "NEGOTIATING", "RECOVERED"];
  const currentStageIndex = pipelineOrder.indexOf(recoveryCase.current_stage);

  const workflowSteps = [
    { name: "Detect", desc: "Webhook failure event captured.", stageKey: "DETECTED" },
    { name: "Diagnose", desc: "AI parsing root cause attributes.", stageKey: "DIAGNOSING" },
    { name: "Evaluate", desc: "Confidence Engine calculating success rates.", stageKey: "EVALUATING" },
    { name: "Decide", desc: "Safety compliance checklist check validation.", stageKey: "ACTION_SELECTED" },
    { name: "Negotiate", desc: "Customer transaction adjustments routing.", stageKey: "NEGOTIATING" },
    { name: "Recover", desc: "Simulate transaction execution via gateway.", stageKey: "RECOVERED" },
  ];

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return "Pending";
    return new Date(dateStr).toLocaleString("en-IN", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const isFinalState = recoveryCase.recovery_status === "Recovered" || recoveryCase.recovery_status === "Failed";

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Link
              href="/recovery"
              className="text-text-secondary hover:text-text-primary flex items-center gap-1.5 font-mono text-xs uppercase"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </Link>
            <h1 className="font-headline text-lg font-bold tracking-tight text-text-primary">
              Case details // {recoveryCase.id?.substring(0, 8)}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            {/* Top Bar Home Button */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-primary hover:border-primary hover:text-primary transition-all font-mono text-xs uppercase rounded-[12px] bg-surface-secondary/50"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Home</span>
            </Link>

            <span className="font-mono text-[10px] text-text-secondary border border-border px-2.5 py-1 uppercase rounded-full">
              Razorpay Test Mode
            </span>

            {/* Profile Avatar Pop-up Menu */}
            <UserAccountMenu />
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6 overflow-y-auto">
          {/* Main Case Info Header */}
          <div className="glass-panel p-6 relative overflow-hidden rounded-[20px]">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-primary"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="font-mono text-xs text-text-secondary">SANDBOX GATEWAY ORDER REFERENCE</div>
                <div className="font-headline text-xl font-bold mt-1">
                  {recoveryCase.payments?.order_id || "Order Payment"}
                </div>
                <div className="font-mono text-xs text-text-secondary mt-1">
                  Merchant ID: {recoveryCase.merchant_id}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
                <div className="border border-border p-3 text-center bg-surface-secondary/40 rounded-[14px]">
                  <div className="text-[9px] text-text-secondary">RECOVERY AMOUNT</div>
                  <div className="text-text-primary font-bold mt-1 text-sm">
                    {formatCurrency(Number(recoveryCase.payments?.amount || 0))}
                  </div>
                </div>
                <div className="border border-border p-3 text-center bg-surface-secondary/40 rounded-[14px]">
                  <div className="text-[9px] text-text-secondary">RECOVERY STATUS</div>
                  <div className="mt-1">
                    <StatusBadge status={recoveryCase.recovery_status} />
                  </div>
                </div>

                {/* Retry Transaction Action Button */}
                {!isFinalState && (
                  <button
                    onClick={handleRetryExecution}
                    disabled={isRetrying}
                    className="bg-primary text-white text-xs font-mono font-bold uppercase px-4 py-3 hover:brightness-110 transition-all flex items-center gap-2 border-none shadow-md shadow-primary/20 rounded-[14px]"
                  >
                    {isRetrying ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                        Executing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                        Retry Transaction
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Diagnostics / AI recommendations */}
            <div className="lg:col-span-8 space-y-6">
              {/* Timeline workflow */}
              <section className="glass-panel p-6 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-6">
                  Loop Execution Timeline
                </div>

                <div className="relative pl-8 border-l border-border/80 border-dashed space-y-6 ml-2">
                  {workflowSteps.map((step, idx) => {
                    const stepIndex = pipelineOrder.indexOf(step.stageKey);
                    const isCompleted = stepIndex < currentStageIndex || recoveryCase.recovery_status === "Recovered";
                    const isActive = stepIndex === currentStageIndex && recoveryCase.recovery_status !== "Recovered";

                    return (
                      <div key={step.name} className="relative">
                        <span
                          className={`absolute -left-[37px] top-1.5 w-2 h-2 ${
                            isCompleted
                              ? "bg-success"
                              : isActive
                              ? "bg-primary animate-pulse"
                              : "bg-border"
                          } rounded-full shadow-sm`}
                        ></span>

                        <div className={!isCompleted && !isActive ? "opacity-45" : ""}>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className={`font-bold uppercase ${isActive ? "text-primary" : "text-text-primary"}`}>
                              {idx + 1}. {step.name}
                            </span>
                            {isActive && (
                              <span className="text-primary text-[10px] animate-pulse font-bold">ACTIVE PIPELINE STEP</span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-1 font-mono">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* AI Diagnosis Details */}
              <section className="glass-panel p-6 rounded-[18px]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-headline text-md font-bold tracking-tight text-text-primary">
                    AI Root Cause Diagnosis
                  </h2>
                  <span className="material-symbols-outlined text-primary text-xl">psychology</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Root Cause Category</span>
                    <span className="text-text-primary font-bold block mt-1">
                      {recoveryCase.audits?.find((a: any) => a.event_type === "DIAGNOSIS_CREATED")?.metadata?.category || "BANK_NETWORK"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Model Confidence</span>
                    <span className="text-primary font-bold block mt-1">
                      {recoveryCase.confidence_score ? `${recoveryCase.confidence_score}% (${(Number(recoveryCase.confidence_score) / 100).toFixed(2)})` : "91% (0.91)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">AI Engine Used</span>
                    <span className="text-success font-bold block mt-1">
                      {recoveryCase.audits?.find((a: any) => a.event_type === "DIAGNOSIS_CREATED")?.actor || "LOCAL_FALLBACK"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/60 text-xs font-mono">
                  <span className="text-[10px] text-text-secondary block uppercase mb-1">Root Cause & Reasoning</span>
                  <p className="text-text-primary font-bold">{recoveryCase.failure_reason || "Temporary Bank Server Issue"}</p>
                  <p className="text-text-secondary leading-relaxed mt-1">
                    {recoveryCase.audits?.find((a: any) => a.event_type === "DIAGNOSIS_CREATED")?.result || "The payment failed with a temporary bank timeout and similar payments usually succeed after retry."}
                  </p>
                </div>

                <div className="mt-4 p-4 bg-surface-secondary border border-border font-mono text-[10px] text-text-secondary rounded-[12px]">
                  &gt; ENGINE: {recoveryCase.audits?.find((a: any) => a.event_type === "DIAGNOSIS_CREATED")?.actor || "LOCAL_FALLBACK"}<br />
                  &gt; CATEGORY: {recoveryCase.audits?.find((a: any) => a.event_type === "DIAGNOSIS_CREATED")?.metadata?.category || "BANK_NETWORK"}<br />
                  &gt; RECOMMENDED NEXT STEP: {recoveryCase.recommended_action || "WAIT_AND_RETRY"}
                </div>
              </section>
            </div>

            {/* Right Column: Policy Constraint checklist / Audit details */}
            <div className="lg:col-span-4 space-y-6">
              {/* Recommended Action & Policy Verification */}
              <section className="glass-panel p-6 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-4">
                  Recovery Action & Policy Gate
                </div>
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Recommended Decision</span>
                    <span className="text-text-primary font-bold block mt-1">
                      {recoveryCase.recommended_action || "WAIT_AND_RETRY"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Policy Result Badge</span>
                    <div className="mt-1">
                      {(() => {
                        const polAudit = recoveryCase.audits?.find((a: any) =>
                          ["POLICY_APPROVED", "POLICY_BLOCKED", "POLICY_ESCALATED"].includes(a.event_type)
                        );
                        const polResult = polAudit?.event_type === "POLICY_BLOCKED" ? "BLOCKED" : polAudit?.event_type === "POLICY_ESCALATED" ? "ESCALATED" : "APPROVED";
                        const badgeColor = polResult === "APPROVED" ? "bg-success/20 text-success border-success/40" : polResult === "ESCALATED" ? "bg-warning/20 text-warning border-warning/40" : "bg-error/20 text-error border-error/40";
                        return (
                          <span className={`inline-block px-3 py-1 border font-bold text-[10px] uppercase ${badgeColor} rounded-full`}>
                            POLICY: {polResult}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Retry Limit Count</span>
                    <span className="text-text-primary font-bold block mt-1">
                      {(recoveryCase.audits || []).filter((a: any) => a.event_type === "RETRY_SCHEDULED" || a.event_type === "RETRY_EXECUTED").length} / 4 Max Retries
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Scheduled Retry / Cooldown</span>
                    <span className="text-text-primary font-bold block mt-1">
                      {formatTimestamp(recoveryCase.scheduled_retry_at)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Specific Audit Trail */}
              <section className="glass-panel p-6 rounded-[18px]">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-4">
                  Case Audit History
                </div>

                <div className="space-y-3 font-mono text-[11px] text-text-secondary max-h-[300px] overflow-y-auto pr-1">
                  {recoveryCase.audits?.map((audit: any) => (
                    <div key={audit.id} className="border-b border-border/60 pb-2">
                      <div className="flex justify-between font-bold text-text-primary text-[10px]">
                        <span>{formatTimestamp(audit.created_at)}</span>
                        <span className="text-primary uppercase">{audit.event_type}</span>
                      </div>
                      <p className="mt-1 leading-relaxed text-text-secondary">{audit.reason}</p>
                      {audit.result && (
                        <p className="mt-0.5 text-text-primary/80 font-mono text-[9px]">&gt; {audit.result}</p>
                      )}
                    </div>
                  ))}
                  {(!recoveryCase.audits || recoveryCase.audits.length === 0) && (
                    <p className="text-center text-text-secondary py-4">No audit trails registered.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
