import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { paymentService } from "@/src/services/payment.service";
import { recoveryService } from "@/src/services/recovery.service";
import { auditService } from "@/src/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, razorpay_order_id } = body;

    // 1. Handle Payment Failure Flow
    if (status === "failed") {
      const { failure_reason, error_code, payment_method } = body;

      // Locate the created payment record
      const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);
      if (!paymentRecord) {
        return NextResponse.json(
          { error: "Payment record not found for the given order_id" },
          { status: 404 }
        );
      }

      // Update payment record to status = "Failed"
      const reason = failure_reason || error_code || "Payment failed or cancelled during checkout";
      await paymentService.updatePaymentByOrderId(razorpay_order_id, {
        status: "Failed",
        failure_reason: reason,
        payment_method: payment_method || null,
      });

      // Create a recovery case automatically
      const recoveryCase = await recoveryService.createRecoveryCase({
        payment_id: paymentRecord.id!,
        merchant_id: paymentRecord.merchant_id,
        current_stage: "Detect",
        recovery_status: "Detected",
        confidence_score: 75,
        recommended_action: "AI Negotiation",
        customer_intent: null,
        scheduled_retry_at: null,
      });

      // Log failure in system audit_logs
      await auditService.createAuditLog({
        recovery_case_id: recoveryCase.id!,
        payment_id: paymentRecord.id!,
        actor: "SYSTEM",
        event_type: "Payment failure detected",
        reason: `Checkout fail. Details: ${reason}`,
        result: `Case created with ID: ${recoveryCase.id}`,
        metadata: { error_code, payment_method },
      });

      return NextResponse.json({
        success: false,
        status: "Failed",
        recovery_case_id: recoveryCase.id,
      });
    }

    // 2. Handle Payment Success Verification Flow
    const { razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature" },
        { status: 400 }
      );
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Server error: RAZORPAY_KEY_SECRET is not configured." },
        { status: 500 }
      );
    }

    // Verify signature securely
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verification failed: invalid signature" },
        { status: 400 }
      );
    }

    // Locate the payment record
    const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);
    if (!paymentRecord) {
      return NextResponse.json(
        { error: "Payment record not found for the given order_id" },
        { status: 404 }
      );
    }

    // Update payment record to status = "Success"
    await paymentService.updatePaymentByOrderId(razorpay_order_id, {
      status: "Success",
      payment_id: razorpay_payment_id,
    });

    // Log success in system audit_logs
    await auditService.createAuditLog({
      recovery_case_id: null,
      payment_id: paymentRecord.id!,
      actor: "SYSTEM",
      event_type: "Payment verified",
      reason: "Razorpay signature verified successfully.",
      result: "Payment status set to Success.",
      metadata: { razorpay_payment_id },
    });

    return NextResponse.json({
      success: true,
      status: "Success",
    });
  } catch (err: any) {
    console.error("Payment verification API error:", err);
    return NextResponse.json(
      { error: err.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}
