import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch payments, cases, and audit logs
    const [paymentsRes, casesRes, auditsRes] = await Promise.all([
      supabase.from("payments").select("*"),
      supabase.from("recovery_cases").select("*"),
      supabase.from("audit_logs").select("*"),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (casesRes.error) throw casesRes.error;
    if (auditsRes.error) throw auditsRes.error;

    const payments = paymentsRes.data || [];
    const cases = casesRes.data || [];
    const audits = auditsRes.data || [];

    // 2. Compute Revenue Metrics
    const failedPayments = payments.filter((p) => {
      const st = (p.status || "").toLowerCase();
      return st === "failed" || st === "declined";
    });
    const revenueAtRisk = failedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const recoveredCasesList = cases.filter((c) => {
      const st = (c.recovery_status || "").toUpperCase();
      const stage = (c.current_stage || "").toUpperCase();
      return st === "RECOVERED" || stage === "RECOVERED";
    });

    const waitingCasesList = cases.filter((c) => {
      const st = (c.recovery_status || "").toUpperCase();
      const stage = (c.current_stage || "").toUpperCase();
      return st === "WAITING" || stage === "WAITING";
    });

    const closedCasesList = cases.filter((c) => {
      const st = (c.recovery_status || "").toUpperCase();
      const stage = (c.current_stage || "").toUpperCase();
      return st === "CLOSED" || st === "FAILED" || stage === "CLOSED";
    });

    const revenueRecovered = recoveredCasesList.reduce((sum, c) => {
      const match = payments.find((p) => p.id === c.payment_id || p.order_id === c.payment_id);
      const amt = match ? Number(match.amount) : Number(c.amount || c.rawAmount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);

    const activeCasesCount = cases.filter((c) => {
      const st = (c.recovery_status || "").toUpperCase();
      const stage = (c.current_stage || "").toUpperCase();
      return st !== "RECOVERED" && st !== "FAILED" && st !== "CLOSED" && stage !== "RECOVERED" && stage !== "CLOSED";
    }).length;

    const successRate =
      revenueAtRisk + revenueRecovered > 0
        ? Number(((revenueRecovered / (revenueAtRisk + revenueRecovered)) * 100).toFixed(1))
        : 0;

    // 3. Compute Phase 7 Metrics
    // A. Average Retry Count
    const retryLogs = audits.filter((a) => a.event_type === "Retry executed");
    const averageRetryCount = cases.length > 0 ? Number((retryLogs.length / cases.length).toFixed(2)) : 0;

    // B. Blocked Recoveries
    const blockedLogs = audits.filter((a) => a.event_type === "POLICY_BLOCKED");
    const blockedRecoveries = blockedLogs.length;

    // C. Merchant Escalations
    const escalatedLogs = audits.filter((a) => a.event_type === "POLICY_ESCALATED");
    const merchantEscalations = escalatedLogs.length;

    // D. Policy Approval Rate
    const approvedLogs = audits.filter((a) => a.event_type === "POLICY_APPROVED");
    const totalPolicyChecks = approvedLogs.length + blockedLogs.length + escalatedLogs.length;
    const policyApprovalRate =
      totalPolicyChecks > 0 ? Number(((approvedLogs.length / totalPolicyChecks) * 100).toFixed(1)) : 100;

    // E. Confidence Distribution
    let confidenceLow = 0;
    let confidenceMedium = 0;
    let confidenceHigh = 0;

    cases.forEach((c) => {
      const score = Number(c.confidence_score);
      if (!score) return;
      if (score <= 40) confidenceLow++;
      else if (score <= 70) confidenceMedium++;
      else confidenceHigh++;
    });

    const confidenceDistribution = {
      low: confidenceLow,
      medium: confidenceMedium,
      high: confidenceHigh,
    };

    // F. Recovery Time Histogram
    let binUnder10m = 0;
    let binUnder1h = 0;
    let binUnder24h = 0;
    let binOver24h = 0;

    recoveredCasesList.forEach((c) => {
      if (!c.created_at || !c.updated_at) return;
      const durationMs = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
      const minutes = durationMs / (1000 * 60);

      if (minutes <= 10) binUnder10m++;
      else if (minutes <= 60) binUnder1h++;
      else if (minutes <= 1440) binUnder24h++;
      else binOver24h++;
    });

    const recoveryTimeHistogram = [
      { bin: "0-10m", count: binUnder10m },
      { bin: "10m-1h", count: binUnder1h },
      { bin: "1h-24h", count: binUnder24h },
      { bin: "24h+", count: binOver24h },
    ];

    let totalRecoveryDurationSeconds = 0;
    recoveredCasesList.forEach((c) => {
      if (c.created_at && c.updated_at) {
        const diffMs = new Date(c.updated_at).getTime() - new Date(c.created_at).getTime();
        totalRecoveryDurationSeconds += diffMs / 1000;
      }
    });
    const averageRecoveryTime =
      recoveredCasesList.length > 0 ? Math.round(totalRecoveryDurationSeconds / recoveredCasesList.length) : 1800;

    return NextResponse.json({
      totalCases: cases.length,
      recoveredCases: recoveredCasesList.length,
      waitingCases: waitingCasesList.length,
      closedCases: closedCasesList.length,
      revenueAtRisk,
      revenueRecovered,
      activeCases: activeCasesCount,
      successRate,
      averageRecoveryTime,
      averageRetryCount,
      blockedRecoveries,
      merchantEscalations,
      policyApprovalRate,
      confidenceDistribution,
      recoveryTimeHistogram,
    });
  } catch (err: any) {
    console.error("GET recovery metrics error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate recovery metrics" },
      { status: 500 }
    );
  }
}
