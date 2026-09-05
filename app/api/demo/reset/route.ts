import { NextResponse } from "next/server";
import { demoService } from "@/src/services/demo.service";
import { logger } from "@/src/lib/logger";

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production") {
      logger.warn("Attempted demo reset in production environment blocked");
      return NextResponse.json(
        { success: false, error: "Demo reset endpoint is disabled in production environment." },
        { status: 403 }
      );
    }

    const result = await demoService.resetDemoData();
    return NextResponse.json(result);
  } catch (err: any) {
    logger.error("Error executing demo reset route", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

