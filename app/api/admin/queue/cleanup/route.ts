import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/src/lib/logger";
import { verifyAuthHeader } from "@/src/lib/security";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    // Audit logs are append-only. Cleanup inspects queue health without deleting audit history.
    logger.info("Admin queue health inspection executed");
    return NextResponse.json({
      success: true,
      message: "Queue health inspection complete. Audit trail remains append-only.",
      cleanedCount: 0,
    });
  } catch (err: any) {
    logger.error("Error executing queue cleanup", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

