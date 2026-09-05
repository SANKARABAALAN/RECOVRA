import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { exceptionService } from "@/src/services/exception.service";
import { automationService } from "@/src/services/automation.service";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [paymentsCount, casesCount, conversationsCount, auditsCount] = await Promise.all([
      supabase.from("payments").select("id", { count: "exact", head: true }),
      supabase.from("recovery_cases").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    ]);

    const exceptions = await exceptionService.getExceptions();
    const unresolvedExceptionsCount = exceptions.filter((e) => !e.resolved).length;
    const workerStatus = automationService.getWorkerStatus();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts: {
        payments: paymentsCount.count || 0,
        recovery_cases: casesCount.count || 0,
        conversations: conversationsCount.count || 0,
        audit_events: auditsCount.count || 0,
        unresolved_exceptions: unresolvedExceptionsCount,
      },
      worker: {
        isRunning: workerStatus.isRunning,
        lastRunAt: workerStatus.lastRunAt,
        processedCount: workerStatus.processedCount,
        status: workerStatus.isRunning ? "RUNNING" : "STANDBY",
      },
    });
  } catch (err: any) {
    logger.error("GET /api/system/status error", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch system status" },
      { status: 500 }
    );
  }
}
