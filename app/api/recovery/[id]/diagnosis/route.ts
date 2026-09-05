import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { aiService, mapToCategory, clampConfidence } from "@/src/services/ai.service";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

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

    // Retrieve latest DIAGNOSIS_CREATED audit log
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .eq("event_type", "DIAGNOSIS_CREATED")
      .order("created_at", { ascending: false })
      .limit(1);

    const latestAudit = auditLogs && auditLogs.length > 0 ? auditLogs[0] : null;
    const meta = latestAudit?.metadata || {};

    const category = meta.category || mapToCategory(caseDetails.failure_reason || "", caseDetails.recommended_action || "");
    const confidence = meta.confidence !== undefined
      ? clampConfidence(Number(meta.confidence))
      : caseDetails.confidence_score
      ? clampConfidence(Number(caseDetails.confidence_score))
      : 0.85;

    const diagnosis = {
      recovery_case_id: id,
      root_cause: caseDetails.failure_reason || "Gateway processing issue",
      category,
      confidence,
      reasoning: latestAudit?.result || `Diagnosed failure code '${caseDetails.failure_reason}'.`,
      recommended_next_step: caseDetails.recommended_action || "WAIT_AND_RETRY",
      ai_engine: latestAudit?.actor || "LOCAL_FALLBACK",
      created_at: latestAudit?.created_at || caseDetails.created_at,
    };

    return NextResponse.json({
      success: true,
      diagnosis,
    });
  } catch (err: any) {
    console.error("GET /api/recovery/[id]/diagnosis error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve diagnosis" },
      { status: 500 }
    );
  }
}
