import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Timeline endpoint params:", params);
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing dynamic ID parameter" }, { status: 400 });
    }

    // 1. Fetch case details
    const { data: recoveryCase, error: caseError } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", id)
      .maybeSingle();

    if (caseError) {
      console.error("Timeline query database error:", caseError);
      return NextResponse.json({ error: caseError.message }, { status: 500 });
    }
    if (!recoveryCase) {
      console.warn("Timeline lookup case not found:", id);
      return NextResponse.json({ error: `Recovery case not found: ${id}` }, { status: 404 });
    }

    // 2. Fetch associated audits
    const { data: audits, error: auditError } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .order("created_at", { ascending: true });

    if (auditError) {
      throw auditError;
    }

    // 3. Map audits to chronological timeline events
    const timeline = (audits || []).map((audit) => {
      let title = audit.event_type;
      let status: "completed" | "active" | "pending" | "failed" = "completed";

      // Translate database events into consumer timeline events
      if (audit.event_type === "Payment detected") {
        title = "Payment Failed";
      } else if (audit.event_type === "AI analyzed payment") {
        title = "AI Diagnosed";
      } else if (audit.event_type === "Strategy selected") {
        title = "Decision Generated";
      } else if (audit.event_type === "POLICY_APPROVED") {
        title = "Policy Approved";
      } else if (audit.event_type === "POLICY_BLOCKED") {
        title = "Policy Blocked";
        status = "failed";
      } else if (audit.event_type === "POLICY_ESCALATED") {
        title = "Merchant Escalated";
        status = "active";
      } else if (audit.event_type === "Retry scheduled") {
        title = "Message Scheduled";
      } else if (audit.event_type === "Intent updated") {
        title = "Customer Responded";
      } else if (audit.event_type === "Retry executed") {
        title = "Retry Executed";
      } else if (audit.event_type === "Recovery succeeded") {
        title = "Payment Recovered";
      } else if (audit.event_type === "Recovery stopped") {
        title = "Recovery Stopped";
        status = "failed";
      }

      return {
        id: audit.id,
        name: title,
        status,
        time: new Date(audit.created_at).toLocaleString("en-IN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        desc: audit.reason || audit.result || "",
      };
    });

    return NextResponse.json(timeline);
  } catch (err: any) {
    console.error("GET timeline error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to compile recovery timeline history" },
      { status: 500 }
    );
  }
}
