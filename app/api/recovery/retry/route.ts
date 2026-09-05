import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { requireAuthenticatedUser } from "@/src/lib/security";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const body = await request.json();
    const { recovery_case_id, retryDelayHours } = body;

    if (!recovery_case_id) {
      return NextResponse.json(
        { success: false, error: "Missing required field: recovery_case_id" },
        { status: 400 }
      );
    }

    const result = await recoveryService.scheduleRetry(recovery_case_id, retryDelayHours);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("POST recovery retry schedule error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to schedule retry" },
      { status: 400 }
    );
  }
}
