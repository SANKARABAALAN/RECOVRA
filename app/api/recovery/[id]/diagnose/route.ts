import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { aiService } from "@/src/services/ai.service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    // Fetch case and associated payment
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

    // Run AI Diagnosis
    const diagnosis = await aiService.diagnosePayment({
      recovery_case_id: id,
      payment_id: payment.id,
      payment_method: payment.payment_method,
      error_code: payment.failure_reason,
      error_description: payment.failure_reason,
      amount: Number(payment.amount),
    });

    // Store Diagnosis in DB & Audit Log
    const result = await aiService.storeDiagnosis(id, diagnosis);

    return NextResponse.json({
      success: true,
      case_id: id,
      diagnosis: result.diagnosis,
    });
  } catch (err: any) {
    console.error("POST /api/recovery/[id]/diagnose error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute AI root cause diagnosis" },
      { status: 500 }
    );
  }
}
