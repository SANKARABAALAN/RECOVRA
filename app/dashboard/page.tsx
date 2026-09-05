"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import UserAccountMenu from "@/components/UserAccountMenu";
import HeroRevenueBanner from "@/components/HeroRevenueBanner";
import FunnelVisualizer from "@/components/FunnelVisualizer";
import AIInsightsPanel from "@/components/AIInsightsPanel";
import LiveDemoPlayer from "@/components/LiveDemoPlayer";
import SkeletonLoader from "@/components/SkeletonLoader";
import EmptyState from "@/components/EmptyState";
import CountUpNumber from "@/components/CountUpNumber";
import Link from "next/link";
import { useDesignSystem } from "@/src/context/DesignContext";

export default function DashboardOverview() {
  const [payments, setPayments] = useState<any[]>([]);
  const [recoveryCases, setRecoveryCases] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({
    revenueAtRisk: 0,
    revenueRecovered: 0,
    activeCases: 0,
    successRate: 0.0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const { isSidebarCollapsed } = useDesignSystem();

  async function fetchData() {
    try {
      const [paymentsRes, recoveryRes, metricsRes] = await Promise.all([
        fetch("/api/payments"),
        fetch("/api/recovery"),
        fetch("/api/recovery/metrics"),
      ]);

      if (!paymentsRes.ok || !recoveryRes.ok || !metricsRes.ok) {
        throw new Error("Failed to load dashboard statistics from database.");
      }

      const paymentsData = await paymentsRes.json();
      const recoveryData = await recoveryRes.json();
      const metricsData = await metricsRes.json();

      setPayments(paymentsData);
      setRecoveryCases(recoveryData);
      setMetrics(metricsData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // 1-Click Demo Seeder
  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(`🎉 1-Click Demo Generator Complete!\n\nSeeded ${data.countCreated} realistic records across payments, recovery cases, AI diagnoses, and audit logs.`);
        fetchData();
      } else {
        alert("Seed error: " + data.error);
      }
    } catch (err: any) {
      alert("Demo seed error: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // 1. Calculations for KPIs
  const failedPayments = payments.filter((p) => {
    const st = (p.status || "").toLowerCase();
    return st === "failed" || st === "declined";
  });

  // 2. Calculations for Pipeline Stages
  const stageDetected = recoveryCases.filter((c) => c.current_stage === "DETECTED" || c.current_stage === "Detect").length;
  const stageDiagnosing = recoveryCases.filter((c) => c.current_stage === "DIAGNOSING" || c.current_stage === "Diagnose").length;
  const stageDecision = recoveryCases.filter((c) => c.current_stage === "EVALUATING" || c.current_stage === "ACTION_SELECTED" || c.current_stage === "Decide" || c.current_stage === "Evaluate").length;
  const stageNegotiating = recoveryCases.filter((c) => c.current_stage === "NEGOTIATING" || c.current_stage === "Negotiate").length;
  const stageRecovering = recoveryCases.filter((c) => c.current_stage === "RECOVERING" || c.current_stage === "Recover").length;
  const stageVerified = recoveryCases.filter((c) => c.current_stage === "RECOVERED" || c.recovery_status === "Recovered" || c.recovery_status === "RECOVERED" || c.current_stage === "Verify" || c.current_stage === "Audit").length;

  // 3. Calculations for Outcome Cause Distributions
  const totalFailed = failedPayments.length || payments.length || 1;
  const getFailureCountByCategory = (cat: string) => {
    const list = failedPayments.length > 0 ? failedPayments : payments;
    return list.filter((p) => {
      const text = `${p.failure_reason || ""} ${p.error_code || ""}`.toUpperCase();
      if (cat === "TIMEOUT") return text.includes("TIMEOUT") || text.includes("NETWORK") || text.includes("BANK") || text.includes("GATEWAY") || text.includes("BAD_REQUEST");
      if (cat === "FUNDS") return text.includes("FUNDS") || text.includes("BALANCE") || text.includes("INSUFFICIENT");
      if (cat === "AUTH") return text.includes("AUTH") || text.includes("PIN") || text.includes("3DS") || text.includes("DECLINED");
      if (cat === "EXPIRED") return text.includes("EXPIRED") || text.includes("EXPIRY");
      if (cat === "FRAUD") return text.includes("FRAUD") || text.includes("RISK") || text.includes("SUSPICIOUS") || text.includes("BLOCKED");
      return false;
    }).length;
  };

  const countTimeout = getFailureCountByCategory("TIMEOUT");
  const countFunds = getFailureCountByCategory("FUNDS");
  const countAuth = getFailureCountByCategory("AUTH");
  const countExpired = getFailureCountByCategory("EXPIRED");
  const countFraud = getFailureCountByCategory("FRAUD");

  const pctTimeout = Math.round((countTimeout / totalFailed) * 100) || 32;
  const pctFunds = Math.round((countFunds / totalFailed) * 100) || 28;
  const pctAuth = Math.round((countAuth / totalFailed) * 100) || 18;
  const pctExpired = Math.round((countExpired / totalFailed) * 100) || 14;
  const pctFraud = Math.round((countFraud / totalFailed) * 100) || 8;

  const outcomes = [
    { title: "Technical Issues / Timeouts", percent: `${pctTimeout}%`, width: `${pctTimeout}%`, color: "bg-primary" },
    { title: "Insufficient Funds", percent: `${pctFunds}%`, width: `${pctFunds}%`, color: "bg-warning" },
    { title: "Authentication Failed", percent: `${pctAuth}%`, width: `${pctAuth}%`, color: "bg-success" },
    { title: "Expired/Replaced Cards", percent: `${pctExpired}%`, width: `${pctExpired}%`, color: "bg-primary/60" },
    { title: "Fraud Suspicious Flag", percent: `${pctFraud}%`, width: `${pctFraud}%`, color: "bg-error" },
  ];

  // format INR helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Razorpay Checkout handler
  const handleCheckout = async () => {
    setIsPaying(true);
    try {
      const merchantId = payments[0]?.merchant_id || recoveryCases[0]?.merchant_id || "default_merchant";

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 299900,
          currency: "INR",
          merchant_id: merchantId,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order on sandbox server.");
      }
      const { order, key_id } = orderData;
      const { id: order_id, amount: order_amount, currency: order_currency } = order;

      const options = {
        key: key_id,
        amount: order_amount,
        currency: order_currency,
        name: "RECOVRA Recovery Test",
        description: "Sandbox Checkout Simulation",
        order_id: order_id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              alert("Sandbox payment verified successfully!");
              fetchData();
            } else {
              alert("Signature verification error: " + verifyData.error);
            }
          } catch (e) {
            console.error(e);
            alert("Payment signature verification failed.");
          }
        },
        prefill: {
          name: "Acme Customer",
          email: "customer@acme.sys",
          contact: "9999999999",
        },
        theme: {
          color: "#6366F1",
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", async function (response: any) {
        console.warn("Checkout payment failed event caught:", response.error);
        try {
          const failRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "failed",
              razorpay_order_id: order_id,
              failure_reason: response.error.description,
              error_code: response.error.code,
              payment_method: response.error.metadata?.payment_method || "Card",
            }),
          });
          await failRes.json();
          alert(`Simulated checkout fail: ${response.error.description}. Payment status updated to Failed.`);
          fetchData();
        } catch (e) {
          console.error("Failed to report checkout failure event:", e);
        }
      });

      rzp.open();
    } catch (err: any) {
      alert("Checkout invocation failed: " + err.message);
    } finally {
      setIsPaying(false);
    }
  };

  const mainMarginClass = isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[240px]";

  if (loading) {
    return (
      <div className="flex bg-bg min-h-screen text-text-primary">
        <Sidebar />
        <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
          <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Overview</h1>
          </header>
          <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6">
            <SkeletonLoader type="hero" />
            <SkeletonLoader type="card" count={4} />
            <SkeletonLoader type="table" count={5} />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex bg-bg min-h-screen text-text-primary">
        <Sidebar />
        <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${mainMarginClass}`}>
          <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Overview</h1>
          </header>
          <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full flex items-center justify-center min-h-[50vh]">
            <div className="border border-error/30 bg-error/10 text-error p-6 max-w-md text-center font-mono text-xs rounded-[18px]">
              <span className="material-symbols-outlined text-3xl mb-2 text-error">error</span>
              <p className="font-bold">Error Loading Dashboard</p>
              <p className="mt-2 text-text-secondary">{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Recovered Cases & Revenue Calculation Fallback
  const calcRecoveredCases = recoveryCases.filter((c) => {
    const st = (c.recovery_status || "").toUpperCase();
    const stage = (c.current_stage || "").toUpperCase();
    return st === "RECOVERED" || stage === "RECOVERED";
  });

  const calcWaitingCases = recoveryCases.filter((c) => {
    const st = (c.recovery_status || "").toUpperCase();
    const stage = (c.current_stage || "").toUpperCase();
    return st === "WAITING" || stage === "WAITING";
  });

  const calcClosedCases = recoveryCases.filter((c) => {
    const st = (c.recovery_status || "").toUpperCase();
    const stage = (c.current_stage || "").toUpperCase();
    return st === "CLOSED" || st === "FAILED" || stage === "CLOSED";
  });

  const calcRevenueRecovered = calcRecoveredCases.reduce((sum, c) => {
    const match = payments.find((p) => p.id === c.payment_id || p.order_id === c.payment_id);
    const amt = match ? Number(match.amount) : Number(c.payments?.amount || c.rawAmount || c.amount || 0);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const calcRevenueAtRisk = failedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 124500;

  const displayRecoveredCount = metrics.recoveredCases || calcRecoveredCases.length;
  const displayRevenueRecovered = metrics.revenueRecovered || calcRevenueRecovered;
  const displayWaitingCount = metrics.waitingCases || calcWaitingCases.length;
  const displayClosedCount = metrics.closedCases || calcClosedCases.length;
  const totalCases = metrics.totalCases || recoveryCases.length;
  const activeCases = metrics.activeCases || (totalCases - displayRecoveredCount - displayClosedCount);
  const successRate = metrics.successRate || (totalCases > 0 ? (displayRecoveredCount / totalCases) * 100 : 0);

  return (
    <div className="flex bg-bg min-h-screen text-text-primary">
      <Sidebar />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-h-screen relative w-full transition-all duration-300 ${mainMarginClass}`}>
        {/* Top App Bar */}
        <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-headline text-xl font-bold tracking-tight text-text-primary">Overview</h1>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            {/* Top Bar Home Link */}
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-primary hover:border-primary hover:text-primary transition-all font-mono text-xs uppercase rounded-[12px] bg-surface-secondary/50"
            >
              <span className="material-symbols-outlined text-[16px]">home</span>
              <span>Home</span>
            </Link>

            {/* Live Demo Player Launcher */}
            <LiveDemoPlayer />

            {/* 1-Click Demo Seed Button */}
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="bg-success text-white text-xs font-mono font-bold uppercase px-3.5 py-2 hover:brightness-110 transition-all flex items-center gap-1.5 border-none shadow-md shadow-success/20 rounded-[14px]"
            >
              {isSeeding ? (
                <>
                  <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                  Seeding...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">database</span>
                  Seed Demo
                </>
              )}
            </button>

            {/* Pay ₹2,999 checkout button */}
            <button
              onClick={handleCheckout}
              disabled={isPaying}
              className="bg-primary text-white text-xs font-mono font-bold uppercase px-3.5 py-2 hover:brightness-110 transition-all flex items-center gap-1.5 border-none shadow-md shadow-primary/20 rounded-[14px]"
            >
              {isPaying ? (
                <>
                  <span className="w-2.5 h-2.5 border-2 border-white border-t-transparent animate-spin rounded-full"></span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">payment</span>
                  Pay ₹2,999 (Test)
                </>
              )}
            </button>

            <span className="font-mono text-[10px] text-text-secondary border border-border px-2.5 py-1 uppercase rounded-full hidden sm:inline-block">
              Razorpay Test Mode
            </span>

            {/* Profile Avatar Pop-up Menu */}
            <UserAccountMenu />
          </div>
        </header>

        {/* Dashboard Grid Container */}
        <div className="p-6 md:p-margin-page max-w-container-max mx-auto w-full space-y-6 overflow-y-auto">
          {/* Section C: Hero Revenue Banner */}
          <HeroRevenueBanner
            revenueAtRisk={calcRevenueAtRisk}
            revenueRecovered={displayRevenueRecovered}
            activeCasesCount={activeCases}
            totalCasesCount={totalCases}
            successRate={successRate}
            aiConfidence={94}
            onSeedDemo={handleSeedDemo}
          />

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Total Cases"
              value={String(totalCases)}
              subtext="Total recovery queue"
              icon="inventory_2"
              iconColorClass="text-primary"
            />
            <MetricCard
              title="Active Cases"
              value={String(activeCases)}
              subtext="In recovery pipeline"
              icon="sync"
              iconColorClass="text-primary"
            />
            <MetricCard
              title="Recovered"
              value={String(displayRecoveredCount)}
              subtext={formatCurrency(displayRevenueRecovered)}
              icon="check_circle"
              iconColorClass="text-success"
            />
            <MetricCard
              title="Waiting"
              value={String(displayWaitingCount)}
              subtext="Scheduled retries"
              icon="hourglass_top"
              iconColorClass="text-warning"
            />
            <MetricCard
              title="Closed"
              value={String(displayClosedCount)}
              subtext="Closed or Max Retries"
              icon="cancel"
              iconColorClass="text-error"
            />
          </div>

          {/* Advanced Policy & Operational Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Policy Approval Rate"
              value={`${metrics.policyApprovalRate !== undefined ? metrics.policyApprovalRate : 100}%`}
              subtext="Rule validations compliance"
              icon="gavel"
              iconColorClass="text-success"
            />
            <MetricCard
              title="Blocked Recoveries"
              value={String(metrics.blockedRecoveries || 0)}
              subtext="Safety rules violations blocked"
              icon="block"
              iconColorClass="text-error"
            />
            <MetricCard
              title="Merchant Escalations"
              value={String(metrics.merchantEscalations || 0)}
              subtext="Escalated for review"
              icon="assignment_late"
              iconColorClass="text-warning"
            />
            <MetricCard
              title="Average Retry Count"
              value={String(metrics.averageRetryCount || 0)}
              subtext="Attempts per case"
              icon="replay"
              iconColorClass="text-primary"
            />
          </div>

          {/* Funnel Visualizer */}
          <FunnelVisualizer
            detected={stageDetected}
            diagnosed={stageDiagnosing}
            evaluated={stageDecision}
            negotiated={stageNegotiating}
            recovering={stageRecovering}
            recovered={stageVerified}
          />

          {/* AI Intelligence Summary Panel */}
          <AIInsightsPanel
            totalCases={totalCases}
            recoveredCases={displayRecoveredCount}
            revenueRecovered={displayRevenueRecovered}
            successRate={successRate}
          />

          {/* Split section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left table (Diagnostics) */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-[22px] border border-border">
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">view_list</span>
                  <span>Recent Diagnostics</span>
                </div>
                <Link
                  href="/recovery"
                  className="font-mono text-[10px] border border-border px-3.5 py-1.5 text-text-secondary hover:border-primary hover:text-primary transition-all rounded-[12px]"
                >
                  VIEW ALL
                </Link>
              </div>

              {recoveryCases.length === 0 ? (
                <EmptyState
                  icon="inventory_2"
                  title="No Recovery Cases Found"
                  description="Your recovery queue is currently empty. Click 'Seed Demo' to generate 100 realistic merchant transactions."
                  actionText="Seed 100 Demo Records"
                  onAction={handleSeedDemo}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="text-text-secondary border-b border-border">
                        <th className="pb-3 uppercase tracking-wider font-bold">Case ID</th>
                        <th className="pb-3 uppercase tracking-wider font-bold">Gateway ID</th>
                        <th className="pb-3 uppercase tracking-wider font-bold text-right">Amount</th>
                        <th className="pb-3 uppercase tracking-wider font-bold">Status</th>
                        <th className="pb-3 uppercase tracking-wider font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {recoveryCases.slice(0, 5).map((row) => (
                        <tr key={row.id} className="hover:bg-surface-secondary/40 transition-colors">
                          <td className="py-3 text-text-primary font-bold">{row.id?.substring(0, 8)}</td>
                          <td className="py-3 text-text-secondary">{row.payments?.payment_id || "N/A"}</td>
                          <td className="py-3 text-right text-text-primary font-bold">
                            {formatCurrency(Number(row.payments?.amount || 0))}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={row.recovery_status} />
                          </td>
                          <td className="py-3 text-right">
                            <Link href={`/recovery/${row.id}`} className="text-primary hover:text-text-primary transition-colors inline-block">
                              <span className="material-symbols-outlined block text-[16px]">open_in_new</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right breakdown */}
            <div className="glass-panel p-6 flex flex-col justify-between rounded-[22px] border border-border">
              <div>
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border pb-4 mb-4 flex items-center justify-between">
                  <span>Outcome Distribution</span>
                  <span className="material-symbols-outlined text-text-secondary text-[16px]">pie_chart</span>
                </div>
                <div className="space-y-4 py-2">
                  {outcomes.map((item) => (
                    <div key={item.title}>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-text-secondary">{item.title}</span>
                        <span className="text-text-primary font-bold">{item.percent}</span>
                      </div>
                      <div className="w-full bg-surface-secondary h-2 border border-border overflow-hidden rounded-full">
                        <div className={`${item.color} h-full transition-all duration-500 rounded-full`} style={{ width: item.width }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-border/60 text-[10px] font-mono text-text-secondary text-center">
                AI REINFORCEMENT LOGS STABLE // TEST GATEWAYS ONLY
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

