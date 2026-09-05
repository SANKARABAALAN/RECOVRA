import { NextRequest, NextResponse } from "next/server";
import { demoService } from "@/src/services/demo.service";
import { logger } from "@/src/lib/logger";
import { requireAdminAccess } from "@/src/lib/security";

export async function POST(request: NextRequest) {
  try {
    await requireAdminAccess(request);
    const result = await demoService.seedDemoScenarios();
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("Error executing demo seed route", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
