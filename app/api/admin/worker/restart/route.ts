import { NextRequest, NextResponse } from "next/server";
import { automationService } from "@/src/services/automation.service";
import { logger } from "@/src/lib/logger";
import { verifyAuthHeader } from "@/src/lib/security";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    automationService.stopWorker();
    const result = automationService.triggerWorkerCycle();
    logger.info("Admin triggered Recovery Worker restart cycle");
    return NextResponse.json({ success: true, message: "Recovery Worker restarted", status: result });
  } catch (err: any) {
    logger.error("Error restarting Recovery Worker", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

