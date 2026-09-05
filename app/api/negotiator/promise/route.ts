import { NextRequest, NextResponse } from "next/server";
import { negotiatorService } from "@/src/services/negotiator.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recovery_case_id, promised_time, promised_amount } = body;

    if (!recovery_case_id || !promised_time || promised_amount === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: recovery_case_id, promised_time, promised_amount" },
        { status: 400 }
      );
    }

    // Call trackPromiseToPay on Negotiator Service
    await negotiatorService.trackPromiseToPay(
      recovery_case_id,
      promised_time,
      Number(promised_amount)
    );

    return NextResponse.json({
      success: true,
      message: "Promise to pay committed successfully.",
    });
  } catch (err: any) {
    console.error("POST negotiator promise error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to commit promise to pay details" },
      { status: 500 }
    );
  }
}
