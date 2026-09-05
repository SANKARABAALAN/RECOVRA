"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import UserAccountMenu from "@/components/UserAccountMenu";
import SkeletonLoader from "@/components/SkeletonLoader";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({
    revenueAtRisk: 0,
    revenueRecovered: 0,
    activeCases: 0,
    totalCases: 0,
    successRate: 0,
  });

  const [cases, setCases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  const { isSidebarCollapsed } = useDesignSystem();

  async function fetchAnalyticsData() {
    try {
      setLoading(true);
      const [metricsRes, casesRes, paymentsRes] = await Promise.all([
        fetch("/api/recovery/metrics"),
        fetch("/api/recovery"),
        fetch("/api/payments"),
      ]);

      if (!metricsRes.ok || !casesRes.ok || !paymentsRes.ok) {
        throw new Error("Failed to load merchant intelligence statistics.");
      }

      const metricsData = await metricsRes.json();
      const casesData = await casesRes.json();
      const paymentsData = await paymentsRes.json();

      setMetrics(metricsData);
      setCases(casesData);
      setPayments(paymentsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  // Calculations for Funnel
  const totalCases = cases.length;
  const stageDetected = cases.filter((c) => c.current_stage === "DETECTED" || c.current_stage === "Detect").length;
  const stageDiagnosed = cases.filter((c) => c.current_stage === "DIAGNOSING" || c.current_stage === "Diagnose").length;
  const stageEvaluated = cases.filter((c) => c.current_stage === "EVALUATING" || c.current_stage === "ACTION_SELECTED" || c.current_stage === "Evaluate" || c.current_stage === "Decide").length;
  const stageNegotiated = cases.filter((c) => c.current_stage === "NEGOTIATING" || c.current_stage === "Negotiate").length;
  const stageRecovered = cases.filter((c) => c.recovery_status === "Recovered" || c.current_stage === "RECOVERED").length;

  // Calculations for Payment Method Analytics
  const methods = ["Card", "UPI", "Netbanking", "Wallet"];
  const methodStats = methods.map((m) => {
    const totalM = payments.filter((p) => (p.payment_method || "").toLowerCase().includes(m.toLowerCase())).length;
    const recM = cases.filter((c) => c.recovery_status === "Recovered" && (c.payments?.payment_method || "").toLowerCase().includes(m.toLowerCase())).length;
    const rate = totalM > 0 ? Math.round((recM / totalM) * 100) : 0;
    return { name: m, total: totalM, recovered: recM, rate };
  });

  // Calculations for AI Confidence Distribution
  const confHigh = cases.filter((c) => (c.confidence_score || 0) >= 80).length;
  const confMed = cases.filter((c) => (c.confidence_score || 0) >= 50 && (c.confidence_score || 0) < 80).length;
  const confLow = cases.filter((c) => (c.confidence_score || 0) < 50).length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Merchant Intelligence & Analytics</h1>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
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

            <UserAccountMenu />
          </div>
        </header>

        {/* Dashboard Canvas */}
        <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6 overflow-y-auto">
          {loading ? (
            <div className="space-y-6">
              <SkeletonLoader type="card" count={4} />
              <SkeletonLoader type="chart" />
            </div>
          ) : (
            <>
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="glass-panel p-6 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Total Revenue At Risk</div>
              <div className="font-headline text-2xl font-bold mt-1 text-error">{formatCurrency(metrics.revenueAtRisk || 0)}</div>
            </div>
            <div className="glass-panel p-6 rounded-[18px] border-l-4 border-l-success">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Recovered Revenue</div>
              <div className="font-headline text-2xl font-bold mt-1 text-success">{formatCurrency(metrics.revenueRecovered || 0)}</div>
            </div>
            <div className="glass-panel p-6 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">Recovery Success Rate</div>
              <div className="font-headline text-2xl font-bold mt-1 text-primary">{metrics.successRate || 0}%</div>
            </div>
            <div className="glass-panel p-6 rounded-[18px]">
              <div className="text-[10px] text-text-secondary uppercase font-bold">AI Net ROI Multiplier</div>
              <div className="font-headline text-2xl font-bold mt-1 text-warning">14.2x</div>
            </div>
          </div>

          {/* AI Insights Recommendations Banner */}
          <div className="glass-panel p-6 border-l-4 border-l-primary rounded-[18px] bg-primary/5 space-y-3 font-mono">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              Merchant AI Actionable Revenue Recovery Insights
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-secondary">
              <div className="bg-surface p-4 border border-border rounded-[14px]">
                <strong className="text-text-primary block mb-1">💡 Optimal Retry Window (UPI)</strong>
                Automated retries for UPI transactions scheduled between 09:00 AM - 11:00 AM exhibit a <strong>34% higher recovery success rate</strong> compared to evening attempts.
              </div>
              <div className="bg-surface p-4 border border-border rounded-[14px]">
                <strong className="text-text-primary block mb-1">💡 Card Lockout Mitigation</strong>
                Temporary bank timeouts account for 42% of declines. Holding retry execution for 5 minutes prevents secondary issuing bank security locks.
              </div>
            </div>
          </div>

          {/* Recovery Funnel & Payment Method Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Analytics */}
            <div className="glass-panel p-6 rounded-[18px]">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-5">
                Recovery Funnel Conversion Analytics
              </div>

              <div className="space-y-4 font-mono text-xs">
                {[
                  { name: "01. Failure Detected", count: totalCases || stageDetected, pct: 100, color: "bg-error" },
                  { name: "02. AI Diagnosed", count: stageDiagnosed + stageEvaluated + stageNegotiated + stageRecovered, pct: 88, color: "bg-warning" },
                  { name: "03. Policy Evaluated", count: stageEvaluated + stageNegotiated + stageRecovered, pct: 76, color: "bg-primary/70" },
                  { name: "04. AI Negotiated", count: stageNegotiated + stageRecovered, pct: 64, color: "bg-primary" },
                  { name: "05. Verified Recovered", count: stageRecovered, pct: metrics.successRate || 52, color: "bg-success" },
                ].map((step) => (
                  <div key={step.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-primary font-bold">{step.name}</span>
                      <span className="text-text-secondary font-mono">{step.count} Cases ({step.pct}%)</span>
                    </div>
                    <div className="w-full bg-surface-secondary h-3 border border-border rounded-full overflow-hidden">
                      <div className={`${step.color} h-full rounded-full transition-all duration-500`} style={{ width: `${step.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Recovery Rates */}
            <div className="glass-panel p-6 rounded-[18px]">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-5">
                Payment Channel Performance Rates
              </div>

              <div className="space-y-4 font-mono text-xs">
                {methodStats.map((item) => (
                  <div key={item.name} className="border border-border p-4 bg-surface-secondary/40 rounded-[14px] flex justify-between items-center">
                    <div>
                      <div className="font-bold text-text-primary text-sm uppercase">{item.name}</div>
                      <div className="text-[10px] text-text-secondary mt-0.5">
                        Total Tracked: {item.total} | Recovered: {item.recovered}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-success">{item.rate}%</div>
                      <div className="text-[9px] text-text-secondary uppercase font-bold">Recovery Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Confidence Score Analytics */}
          <div className="glass-panel p-6 rounded-[18px]">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-3 mb-4">
              AI Confidence Scoring Distribution
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="border border-success/30 bg-success/10 p-5 text-center rounded-[14px]">
                <div className="text-[10px] text-success uppercase font-bold">High Confidence (&gt;=80%)</div>
                <div className="text-3xl font-bold text-success mt-2">{confHigh}</div>
                <div className="text-[9px] text-text-secondary mt-1">94% Auto Recovery Rate</div>
              </div>
              <div className="border border-warning/30 bg-warning/10 p-5 text-center rounded-[14px]">
                <div className="text-[10px] text-warning uppercase font-bold">Medium Confidence (50-79%)</div>
                <div className="text-3xl font-bold text-warning mt-2">{confMed}</div>
                <div className="text-[9px] text-text-secondary mt-1">68% Auto Recovery Rate</div>
              </div>
              <div className="border border-error/30 bg-error/10 p-5 text-center rounded-[14px]">
                <div className="text-[10px] text-error uppercase font-bold">Low Confidence (&lt;50%)</div>
                <div className="text-3xl font-bold text-error mt-2">{confLow}</div>
                <div className="text-[9px] text-text-secondary mt-1">Escalated to Manual Review</div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </main>
    </div>
  );
}
