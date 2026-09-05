import { NextRequest, NextResponse } from "next/server";
import { exceptionService } from "@/src/services/exception.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing exception ID" }, { status: 400 });
    }

    const resolvedItem = await exceptionService.resolveException(id);

    return NextResponse.json({
      success: true,
      exception: resolvedItem,
    });
  } catch (err: any) {
    console.error("PATCH /api/exceptions/[id]/resolve error:", err);
    const status = err.message.includes("not found") ? 404 : err.message.includes("already resolved") ? 400 : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve exception" },
      { status }
    );
  }
}
