import { NextRequest, NextResponse } from "next/server";
import { razorpayAdapter } from "@/src/adapters/razorpay/razorpay.adapter";
import { paymentService } from "@/src/services/payment.service";
import { recoveryService } from "@/src/services/recovery.service";
import { auditService } from "@/src/services/audit.service";
import { checkRateLimit } from "@/src/lib/security";
import { logger } from "@/src/lib/logger";
import { getSupabaseAdmin } from "@/src/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    // Rate Limiting Gate (max 30 requests per minute)
    const rateLimit = checkRateLimit(`webhook_${clientIp}`, 30, 60000);
    if (!rateLimit.allowed) {
      logger.warn("Webhook rate limit exceeded", { clientIp });
      return NextResponse.json({ success: false, error: "Rate limit exceeded" }, { status: 429 });
    }

    const signature = request.headers.get("x-razorpay-signature");
    const eventIdHeader = request.headers.get("x-razorpay-event-id");
    const rawBody = await request.text();

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_SECRET || "";

    if (!signature) {
      logger.warn("Webhook request missing x-razorpay-signature header");
      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: null,
        actor: "SYSTEM",
        event_type: "Webhook rejected",
        reason: "Missing x-razorpay-signature header",
        result: "HTTP 400 Bad Request.",
      });
      return NextResponse.json(
        { success: false, error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    // 1. Verify webhook signature
    const isValid = razorpayAdapter.verifyWebhookSignature(rawBody, signature, webhookSecret);

    if (!isValid) {
      logger.error("Invalid Razorpay webhook signature");
      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: null,
        actor: "SYSTEM",
        event_type: "Webhook rejected",
        reason: "Invalid Razorpay webhook signature verified.",
        result: "HTTP 400 Bad Request.",
        metadata: { signature },
      });
      return NextResponse.json({ success: false, error: "Invalid webhook signature" }, { status: 400 });
    }

    // 2. Parse event payload safely
    let eventData: any;
    try {
      eventData = JSON.parse(rawBody);
    } catch (parseErr) {
      logger.error("Malformed webhook JSON body", parseErr);
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventId = eventIdHeader || eventData.event_id || eventData.id || `${eventData.created_at}_${eventData.event}`;
    const eventType = eventData.event;
    const paymentPayload = eventData.payload?.payment?.entity;

    // Atomically claim event ID. The unique constraint is the replay lock.
    if (eventId) {
      const db: any = getSupabaseAdmin();
      const { error: claimError } = await db.from("webhook_events").insert({
          event_id: eventId,
          event_type: eventType || "unknown",
        });
      if (claimError) {
        if (claimError.code === "23505") {
          return NextResponse.json({ success: true, message: "Duplicate webhook event skipped", eventId });
        }
        throw new Error(`Unable to claim webhook event: ${claimError.message}`);
      }
    }

    if (!paymentPayload) {
      return NextResponse.json({ success: true, message: "Payload does not contain payment entity" });
    }

    const orderId = paymentPayload.order_id;
    const paymentId = paymentPayload.id;
    const method = paymentPayload.method;
    const amount = paymentPayload.amount;

    if (!orderId) {
      return NextResponse.json({ success: true, message: "No order_id associated with payment payload" });
    }

    // 3. Locate payment record in database
    const paymentRecord = await paymentService.getPaymentByOrderId(orderId);
    if (!paymentRecord) {
      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: null,
        actor: "SYSTEM",
        event_type: "Webhook received",
        reason: `Webhook ${eventType} triggered for unknown order_id: ${orderId}`,
        result: "Ignored.",
        metadata: { orderId, paymentId, eventType },
      });
      return NextResponse.json({ success: true, message: "Payment record not found" });
    }

    // Log webhook event receipt
    await auditService.createAuditLog({
      recovery_case_id: null,
      payment_id: paymentRecord.id!,
      actor: "SYSTEM",
      event_type: "Webhook received",
      reason: `Webhook trigger: ${eventType}`,
      result: `Processing event for order ID: ${orderId}`,
      metadata: { eventType, paymentId, orderId, eventId },
    });

    // 4. Idempotency check: If already set to Success, skip duplicates
    if (paymentRecord.status === "Success") {
      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: paymentRecord.id!,
        actor: "SYSTEM",
        event_type: "Webhook duplicate skipped",
        reason: `Payment order_id ${orderId} is already set to Success.`,
        result: "Skipped duplicate event processing.",
        metadata: { eventType, orderId },
      });
      return NextResponse.json({ success: true, message: "Duplicate event skipped" });
    }

    // 5. Handle Captured event (Success)
    if (eventType === "payment.captured" || eventType === "payment.success") {
      await paymentService.updatePaymentByOrderId(orderId, {
        status: "Success",
        payment_id: paymentId,
        payment_method: method || null,
      });

      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: paymentRecord.id!,
        actor: "SYSTEM",
        event_type: "Payment success",
        reason: "Razorpay webhook reported successful payment capture.",
        result: "Payment status set to Success.",
        metadata: { paymentId, method, amount },
      });
    }
    // 6. Handle Failed event (Failure)
    else if (eventType === "payment.failed") {
      const errorCode = paymentPayload.error_code || "UNKNOWN_ERROR";
      const errorDesc = paymentPayload.error_description || "Payment checkout transaction failed.";

      await paymentService.updatePaymentByOrderId(orderId, {
        status: "Failed",
        payment_id: paymentId,
        payment_method: method || null,
        failure_reason: errorDesc,
      });

      await auditService.createAuditLog({
        recovery_case_id: null,
        payment_id: paymentRecord.id!,
        actor: "SYSTEM",
        event_type: "Payment failure",
        reason: `Razorpay webhook reported failure: ${errorDesc} (Code: ${errorCode})`,
        result: "Payment status set to Failed.",
        metadata: { paymentId, errorCode, errorDesc },
      });

      // Trigger Recovery Engine Failure Detector (automatically spawns case & AI analysis)
      await recoveryService.processPaymentFailure(paymentRecord.id!);
    }

    return NextResponse.json({ success: true, eventId });
  } catch (err: any) {
    logger.error("Webhook route error", err);
    return NextResponse.json(
      { success: false, error: err.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
