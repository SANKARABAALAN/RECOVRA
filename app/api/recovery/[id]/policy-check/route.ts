import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { aiService } from "@/src/services/ai.service";
import { policyService } from "@/src/services/policy.service";

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

    const body = await request.json().catch(() => ({}));
    const proposed_decision = body.proposed_decision || caseDetails.recommended_action || "WAIT_AND_RETRY";

    // Count previous retries from audits
    const retryAudits = (caseDetails.audits || []).filter(
      (a: any) => a.event_type === "RETRY_SCHEDULED" || a.event_type === "RETRY_EXECUTED"
    );
    const retryCount = body.retry_count !== undefined ? body.retry_count : retryAudits.length;

    // Get category from AI diagnosis
    const diagnosis = await aiService.diagnosePayment({
      payment_method: caseDetails.payments?.payment_method,
      error_code: caseDetails.payments?.failure_reason,
      amount: Number(caseDetails.payments?.amount || 0),
    });

    const result = await policyService.evaluatePolicy(id, caseDetails.payment_id, {
      proposed_decision,
      retry_count: retryCount,
      last_retry_at: retryAudits.length > 0 ? retryAudits[retryAudits.length - 1].created_at : null,
      customer_opt_out: body.customer_opt_out || false,
      payment_status: caseDetails.payments?.status,
      recovery_status: caseDetails.recovery_status,
      current_stage: caseDetails.current_stage,
      category: diagnosis.category,
    });

    return NextResponse.json({
      success: true,
      case_id: id,
      policy_evaluation: result,
    });
  } catch (err: any) {
    console.error("POST /api/recovery/[id]/policy-check error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to evaluate policy" },
      { status: 500 }
    );
  }
}
