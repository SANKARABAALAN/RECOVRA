import { NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await recoveryService.getRecoveryCases();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch recovery cases" },
      { status: 500 }
    );
  }
}
