import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { verifyAuthHeader } from "@/src/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const auditData = logs || [];

    if (format === "json") {
      return new NextResponse(JSON.stringify(auditData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="recovra_audit_logs.json"',
        },
      });
    }

    // CSV format conversion
    const headers = ["ID", "Recovery Case ID", "Payment ID", "Actor", "Event Type", "Reason", "Result", "Timestamp"];
    const rows = auditData.map((row: any) => [
      row.id || "",
      row.recovery_case_id || "",
      row.payment_id || "",
      `"${(row.actor || "").replace(/"/g, '""')}"`,
      `"${(row.event_type || "").replace(/"/g, '""')}"`,
      `"${(row.reason || "").replace(/"/g, '""')}"`,
      `"${(row.result || "").replace(/"/g, '""')}"`,
      row.created_at || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="recovra_audit_logs.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
