import { NextRequest, NextResponse } from "next/server";
import { automationService } from "@/src/services/automation.service";
import { logger } from "@/src/lib/logger";
import { requireAuthenticatedUser } from "@/src/lib/security";

export async function POST(req: NextRequest) {
  try {
    await requireAuthenticatedUser(req);
    const body = await req.json();
    const { caseId, paymentToken } = body;

    if (!caseId) {
      return NextResponse.json({ error: "Missing required parameter caseId" }, { status: 400 });
    }

    const result = await automationService.verifyRecoveryOutcome(caseId, paymentToken);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    logger.error("Error verifying recovery outcome", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
