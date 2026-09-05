import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { caseId } = params;
    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId parameter" }, { status: 400 });
    }

    const caseDetails = await recoveryService.getRecoveryCaseById(caseId);
    if (!caseDetails) {
      return NextResponse.json({ error: `Recovery case not found: ${caseId}` }, { status: 404 });
    }

    // Load the latest message
    const { data: latestMsg } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load the latest policy check audit log
    const { data: latestPolicy } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", caseId)
      .in("event_type", ["POLICY_APPROVED", "POLICY_BLOCKED", "POLICY_ESCALATED"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load the latest Promise-to-Pay created audit log
    const { data: latestPromise } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", caseId)
      .eq("event_type", "PROMISE_CREATED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let intent = "UNKNOWN";
    let sentiment = "NEUTRAL";
    let confidence = caseDetails.confidence_score ? Number(caseDetails.confidence_score) : 90;

    if (latestMsg) {
      intent = latestMsg.detected_intent || "UNKNOWN";
      if (latestMsg.detected_intent && latestMsg.detected_intent.startsWith("{")) {
        try {
          const parsed = JSON.parse(latestMsg.detected_intent);
          intent = parsed.intent || "UNKNOWN";
          sentiment = parsed.sentiment || "NEUTRAL";
        } catch (e) {
          // Fallback
        }
      }
      if (latestMsg.confidence_score) {
        confidence = Number(latestMsg.confidence_score);
      }
    }

    return NextResponse.json({
      intent,
      sentiment,
      confidence,
      recommended_action: caseDetails.recommended_action || "EVALUATING",
      status: caseDetails.recovery_status,
      stage: caseDetails.current_stage,
      merchant_escalation: caseDetails.recommended_action === "HANDOFF_TO_MERCHANT" || caseDetails.current_stage === "CLOSED",
      policy_status: latestPolicy ? latestPolicy.event_type : "PENDING",
      policy_reason: latestPolicy ? latestPolicy.reason : "No policy checks executed yet.",
      promise_active: !!latestPromise,
      promise_details: latestPromise ? latestPromise.metadata : null,
    });
  } catch (err: any) {
    console.error("GET Negotiator State error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch negotiator state" },
      { status: 500 }
    );
  }
}
