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

    const result = await automationService.runRecoveryWorker();
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error("Error running worker manually via API", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

