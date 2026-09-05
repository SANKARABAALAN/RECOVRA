import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    const body = await request.json();
    const { stage, reason } = body;

    if (!stage) {
      return NextResponse.json(
        { success: false, error: "Missing required body parameter: stage" },
        { status: 400 }
      );
    }

    const updatedCase = await recoveryService.transitionStage(id, stage, reason);
    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err: any) {
    console.error("PATCH recovery stage transition error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update recovery stage" },
      { status: 400 }
    );
  }
}
