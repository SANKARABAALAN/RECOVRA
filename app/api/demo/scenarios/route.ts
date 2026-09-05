import { NextResponse } from "next/server";
import { demoService } from "@/src/services/demo.service";
import { logger } from "@/src/lib/logger";

export async function GET() {
  try {
    const scenarios = demoService.getScenarios();
    return NextResponse.json({ success: true, scenarios });
  } catch (err: any) {
    logger.error("Error retrieving demo scenarios", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
