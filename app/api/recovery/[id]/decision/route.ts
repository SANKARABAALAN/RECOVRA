import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { aiService } from "@/src/services/ai.service";
import { decisionService } from "@/src/services/decision.service";
import { auditService } from "@/src/services/audit.service";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    const caseDetails = await recoveryService.getRecoveryCaseById(id);
    if (!caseDetails) {
      return NextResponse.json({ success: false, error: `Recovery case not found: ${id}` }, { status: 404 });
    }

    const payment = caseDetails.payments;
    if (!payment) {
      return NextResponse.json(
        { success: false, error: `Associated payment record missing for case ${id}` },
        { status: 404 }
      );
    }

    // Run AI Diagnosis to get category & confidence
    const diagnosis = await aiService.diagnosePayment({
      recovery_case_id: id,
      payment_id: payment.id,
      payment_method: payment.payment_method,
      error_code: payment.failure_reason,
      amount: Number(payment.amount),
    });

    // Generate Decision
    const decision = decisionService.generateDecision({
      category: diagnosis.category,
      confidence: diagnosis.confidence,
      amount: Number(payment.amount),
    });

    // Store Decision on Recovery Case
    await recoveryService.updateRecoveryCase(id, {
      recommended_action: decision.decision,
      current_stage: caseDetails.current_stage === "DIAGNOSING" ? "EVALUATING" : caseDetails.current_stage,
    });

    // Write audit log: DECISION_CREATED
    await auditService.createAuditLog({
      recovery_case_id: id,
      payment_id: payment.id,
      actor: "DECISION_ENGINE",
      event_type: "DECISION_CREATED",
      reason: decision.reason,
      result: `Decision: ${decision.decision}. Priority: ${decision.priority}. Delay: ${decision.recommended_delay_minutes}m.`,
      metadata: {
        decision: decision.decision,
        priority: decision.priority,
        recommended_delay_minutes: decision.recommended_delay_minutes,
      },
    });

    return NextResponse.json({
      success: true,
      case_id: id,
      decision,
    });
  } catch (err: any) {
    console.error("POST /api/recovery/[id]/decision error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate decision" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    const caseDetails = await recoveryService.getRecoveryCaseById(id);
    if (!caseDetails) {
      return NextResponse.json({ success: false, error: `Recovery case not found: ${id}` }, { status: 404 });
    }

    // Retrieve DECISION_CREATED audit log
    const { data: decLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .eq("event_type", "DECISION_CREATED")
      .order("created_at", { ascending: false })
      .limit(1);

    // Retrieve latest POLICY_* audit log
    const { data: polLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .in("event_type", ["POLICY_APPROVED", "POLICY_BLOCKED", "POLICY_ESCALATED"])
      .order("created_at", { ascending: false })
      .limit(1);

    const latestDec = decLogs && decLogs.length > 0 ? decLogs[0] : null;
    const latestPol = polLogs && polLogs.length > 0 ? polLogs[0] : null;

    const decisionName = latestDec?.metadata?.decision || caseDetails.recommended_action || "WAIT_AND_RETRY";
    const priority = latestDec?.metadata?.priority || "MEDIUM";
    const delayMinutes = latestDec?.metadata?.recommended_delay_minutes ?? 30;

    let policyResult = "APPROVED";
    if (latestPol) {
      if (latestPol.event_type === "POLICY_BLOCKED") policyResult = "BLOCKED";
      if (latestPol.event_type === "POLICY_ESCALATED") policyResult = "ESCALATED";
    }

    return NextResponse.json({
      success: true,
      case_id: id,
      decision: {
        decision: decisionName,
        reason: latestDec?.reason || "Decision generated based on category rules.",
        priority,
        recommended_delay_minutes: delayMinutes,
        policy_result: policyResult,
        policy_reason: latestPol?.reason || "Policy validation active.",
        created_at: latestDec?.created_at || caseDetails.created_at,
      },
    });
  } catch (err: any) {
    console.error("GET /api/recovery/[id]/decision error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve decision" },
      { status: 500 }
    );
  }
}
