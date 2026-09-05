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

    const { data: cases, error } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const recoveryData = cases || [];

    if (format === "json") {
      return new NextResponse(JSON.stringify(recoveryData, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="recovra_recovery_cases.json"',
        },
      });
    }

    // CSV format conversion
    const headers = ["Case ID", "Merchant ID", "Payment ID", "Order ID", "Amount", "Stage", "Status", "Confidence", "Action", "Customer Intent", "Created At"];
    const rows = recoveryData.map((row: any) => [
      row.id || "",
      row.merchant_id || "",
      row.payment_id || "",
      `"${(row.payments?.order_id || "").replace(/"/g, '""')}"`,
      row.payments?.amount || 0,
      `"${(row.current_stage || "").replace(/"/g, '""')}"`,
      `"${(row.recovery_status || "").replace(/"/g, '""')}"`,
      row.confidence_score || 0,
      `"${(row.recommended_action || "").replace(/"/g, '""')}"`,
      `"${(row.customer_intent || "").replace(/"/g, '""')}"`,
      row.created_at || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="recovra_recovery_cases.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
