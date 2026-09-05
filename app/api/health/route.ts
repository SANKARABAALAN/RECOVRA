import { NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";
import { automationService } from "@/src/services/automation.service";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  let dbStatus = "HEALTHY";
  try {
    const { error } = await supabase.from("merchants").select("id").limit(1);
    if (error) dbStatus = "DEGRADED";
  } catch (e) {
    dbStatus = "UNHEALTHY";
  }

  const razorpayStatus = process.env.RAZORPAY_KEY_ID ? "HEALTHY" : "NOT_CONFIGURED";
  const geminiStatus = process.env.GEMINI_API_KEY ? "HEALTHY" : "DEGRADED_FALLBACK_ACTIVE";
  
  let workerHealth = "HEALTHY";
  try {
    const wStatus = automationService.getWorkerStatus();
    if (!wStatus.isRunning) workerHealth = "IDLE";
  } catch {
    workerHealth = "DEGRADED";
  }

  const queueStatus = "HEALTHY";
  const schedulerStatus = "HEALTHY";
  const apiStatus = "HEALTHY";

  const isHealthy = dbStatus === "HEALTHY";
  const overallStatus = isHealthy ? "HEALTHY" : "DEGRADED";

  return NextResponse.json(
    {
      status: overallStatus,
      version: "1.0.0",
      timestamp,
      services: {
        api: apiStatus,
        database: dbStatus,
        razorpay: razorpayStatus,
        gemini: geminiStatus,
        recoveryWorker: workerHealth,
        queue: queueStatus,
        scheduler: schedulerStatus,
      },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
