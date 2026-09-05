import { NextRequest, NextResponse } from "next/server";
import { razorpay } from "@/src/lib/razorpay";
import { paymentService } from "@/src/services/payment.service";

export async function POST(request: NextRequest) {
  try {
    const { amount, currency, merchant_id } = await request.json();

    if (!amount || !currency || !merchant_id) {
      return NextResponse.json(
        { error: "Missing required fields: amount, currency, merchant_id" },
        { status: 400 }
      );
    }

    // Amount is passed in major unit (e.g. 2999), Razorpay expects minor units (paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: currency || "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // Save payment record in Supabase with status = "created"
    await paymentService.createPayment({
      merchant_id,
      order_id: order.id,
      payment_id: null,
      amount: Number(amount),
      currency: currency || "INR",
      payment_method: null,
      status: "created",
      failure_reason: null,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: Number(amount),
      currency: currency || "INR",
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Razorpay order API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
