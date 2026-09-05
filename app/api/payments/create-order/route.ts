import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/src/services/payment.service";
import { requireAuthenticatedUser } from "@/src/lib/security";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request);
    const { amount, currency } = await request.json();

    if (!amount) {
      return NextResponse.json(
        { success: false, error: "Missing required field: amount" },
        { status: 400 }
      );
    }

    // Call service layer (amount is in paise)
    const order = await paymentService.createRazorpayOrder(
      Number(amount),
      currency || "INR",
      auth.merchantId
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Razorpay create-order API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
