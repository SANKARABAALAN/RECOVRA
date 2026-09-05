import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { logger } from "@/src/lib/logger";
import { verifyAuthHeader } from "@/src/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    const timestamp = new Date().toISOString();
    
    const [merchants, payments, cases, audits, convs] = await Promise.all([
      supabase.from("merchants").select("id, name, email, created_at"),
      supabase.from("payments").select("id", { count: "exact", head: true }),
      supabase.from("recovery_cases").select("id", { count: "exact", head: true }),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
    ]);

    const snapshot = {
      version: "1.0.0",
      timestamp,
      environment: process.env.NODE_ENV || "development",
      tables: {
        merchants: { count: merchants.data?.length || 0, items: merchants.data || [] },
        payments: { count: payments.count || 0 },
        recovery_cases: { count: cases.count || 0 },
        audit_logs: { count: audits.count || 0 },
        conversations: { count: convs.count || 0 },
      },
    };

    logger.info("Database snapshot metadata exported", { timestamp });
    return NextResponse.json({ success: true, snapshot });
  } catch (err: any) {
    logger.error("Error generating admin snapshot", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

