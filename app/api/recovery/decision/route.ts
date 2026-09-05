import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { decisionService } from "@/src/services/decision.service";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recovery_case_id } = body;

    if (!recovery_case_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: recovery_case_id" },
        { status: 400 }
      );
    }

    // 1. Fetch case details
    const caseDetails = await recoveryService.getRecoveryCaseById(recovery_case_id);
    if (!caseDetails) {
      return NextResponse.json(
        { success: false, error: `Recovery case not found: ${recovery_case_id}` },
        { status: 404 }
      );
    }

    // 2. Generate Decision using Decision Service
    const decision = decisionService.generateDecision({
      category: caseDetails.failure_reason || "BANK_NETWORK",
      confidence: caseDetails.confidence_score ? Number(caseDetails.confidence_score) / 100 : 0.85,
      amount: Number(caseDetails.payments?.amount || 0),
    });

    // 3. Update recovery case parameters
    await supabase
      .from("recovery_cases")
      .update({
        recommended_action: decision.decision,
      })
      .eq("id", recovery_case_id);

    return NextResponse.json({ success: true, decision });
  } catch (err: any) {
    console.error("Recovery Decision API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate recovery decision" },
      { status: 500 }
    );
  }
}
