import { NextResponse } from "next/server";
import { validateEnvironment } from "@/src/lib/env";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const envResult = validateEnvironment();
    return NextResponse.json({
      status: envResult.valid ? "HEALTHY" : "DEGRADED",
      timestamp: new Date().toISOString(),
      ...envResult,
    });
  } catch (err: any) {
    logger.error("Error executing environment health check", err);
    return NextResponse.json(
      {
        status: "UNHEALTHY",
        valid: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
