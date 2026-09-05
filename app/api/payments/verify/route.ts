import { NextRequest, NextResponse } from "next/server";
import { razorpayAdapter } from "@/src/adapters/razorpay/razorpay.adapter";
import { paymentService } from "@/src/services/payment.service";
import { recoveryService } from "@/src/services/recovery.service";
import { auditService } from "@/src/services/audit.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { status, razorpay_order_id } = body;

    // 1. Handle Checkout Failure Logging & Recovery Trigger Flow (Phase 5)
    if (status === "failed") {
      const { failure_reason, error_code, payment_method } = body;

      const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);
      if (!paymentRecord) {
        return NextResponse.json(
          { success: false, error: "Payment record not found for the given order_id" },
          { status: 404 }
        );
      }

      // Update payment record status = "Failed"
      const reason = failure_reason || error_code || "Checkout aborted or payment failed.";
      await paymentService.updatePaymentByOrderId(razorpay_order_id, {
        status: "Failed",
        failure_reason: reason,
        payment_method: payment_method || null,
      });

      // Trigger Recovery Engine Failure Detector (automatically spawns case & AI analysis)
      const recoveryCase = await recoveryService.processPaymentFailure(paymentRecord.id!);

      return NextResponse.json({
        success: true,
        status: "Failed",
        recovery_case_id: recoveryCase ? recoveryCase.id : null,
      });
    }

    // 2. Handle Signature Success Verification Flow
    const { razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: razorpay_order_id, razorpay_payment_id, razorpay_signature" },
        { status: 400 }
      );
    }

    // Call adapter signature verification
    const isValid = razorpayAdapter.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    const paymentRecord = await paymentService.getPaymentByOrderId(razorpay_order_id);

    if (!isValid) {
      // Log verification failure event
      if (paymentRecord) {
        await auditService.createAuditLog({
          recovery_case_id: null,
          payment_id: paymentRecord.id!,
          actor: "SYSTEM",
          event_type: "Verification failure",
          reason: "Razorpay signature verification failed.",
          result: "Signature mismatch.",
          metadata: { razorpay_payment_id, razorpay_signature },
        });
      }
      return NextResponse.json(
        { success: false, error: "Payment verification failed: invalid signature" },
        { status: 400 }
      );
    }

    if (!paymentRecord) {
      return NextResponse.json(
        { success: false, error: "Payment record not found for order_id" },
        { status: 404 }
      );
    }

    // Update payment record to Success
    await paymentService.updatePaymentByOrderId(razorpay_order_id, {
      status: "Success",
      payment_id: razorpay_payment_id,
    });

    // Write successful payment verification to audit logs
    await auditService.createAuditLog({
      recovery_case_id: null,
      payment_id: paymentRecord.id!,
      actor: "SYSTEM",
      event_type: "Payment success",
      reason: "Razorpay payment verified successfully.",
      result: "Payment status set to Success.",
      metadata: { razorpay_payment_id },
    });

    return NextResponse.json({
      success: true,
      status: "Success",
    });
  } catch (err: any) {
    console.error("Signature verification error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify signature" },
      { status: 500 }
    );
  }
}
