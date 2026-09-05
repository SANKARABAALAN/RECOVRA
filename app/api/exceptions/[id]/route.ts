import { NextRequest, NextResponse } from "next/server";
import { exceptionService } from "@/src/services/exception.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing exception ID" }, { status: 400 });
    }

    const exceptions = await exceptionService.getExceptions();
    const item = exceptions.find((e) => e.id === id);

    if (!item) {
      return NextResponse.json(
        { success: false, error: `Exception not found: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      exception: item,
    });
  } catch (err: any) {
    console.error("GET /api/exceptions/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch exception details" },
      { status: 500 }
    );
  }
}
