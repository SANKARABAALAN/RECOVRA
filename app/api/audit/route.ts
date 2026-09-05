import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const event_type = searchParams.get("event_type");
    const recovery_case_id = searchParams.get("recovery_case_id");
    const payment_id = searchParams.get("payment_id");
    const actor = searchParams.get("actor");
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (event_type) {
      query = query.eq("event_type", event_type);
    }
    if (recovery_case_id) {
      query = query.eq("recovery_case_id", recovery_case_id);
    }
    if (payment_id) {
      query = query.eq("payment_id", payment_id);
    }
    if (actor) {
      query = query.eq("actor", actor);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: count || (data || []).length,
      limit,
      offset,
      audit_logs: data || [],
    });
  } catch (err: any) {
    console.error("GET /api/audit error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
