import { NextResponse } from "next/server";
import { paymentService } from "@/src/services/payment.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await paymentService.getPayments();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
