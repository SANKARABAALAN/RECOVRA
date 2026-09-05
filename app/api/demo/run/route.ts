import { NextRequest, NextResponse } from "next/server";
import { demoService } from "@/src/services/demo.service";
import { logger } from "@/src/lib/logger";
import { requireAdminAccess } from "@/src/lib/security";

export async function POST(req: NextRequest) {
  try {
    await requireAdminAccess(req);
    const body = await req.json().catch(() => ({}));
    const scenarioId = body.scenarioId || body.scenario_id || "upi_outage";
    const result = await demoService.runDemoScenario(scenarioId);
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("Error running demo scenario route", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
