import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Missing dynamic ID parameter" }, { status: 400 });
    }

    const data = await recoveryService.getRecoveryCaseById(id);

    if (!data) {
      return NextResponse.json({ error: `Recovery case not found: ${id}` }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET recovery case by ID error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch recovery case detail" },
      { status: 500 }
    );
  }
}
