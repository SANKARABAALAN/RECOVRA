import { razorpay } from "@/src/lib/razorpay";
import crypto from "crypto";

/**
 * Timing-Safe Buffer Comparison Helper
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf-8");
    const bufB = Buffer.from(b, "utf-8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const razorpayAdapter = {
  async createOrder(amount: number, currency: string, receipt: string) {
    return await razorpay.orders.create({
      amount,
      currency,
      receipt,
    });
  },

  async createPaymentLink(params: {
    amount: number;
    currency?: string;
    description: string;
    customerName?: string;
    customerEmail?: string;
  }) {
    if (razorpay && razorpay.paymentLink && typeof razorpay.paymentLink.create === "function") {
      const link = await razorpay.paymentLink.create({
          amount: Math.round(params.amount * 100),
          currency: params.currency || "INR",
          accept_partial: false,
          description: params.description,
          customer: {
            name: params.customerName || "Customer",
            email: params.customerEmail || "customer@acme.sys",
          },
          notify: { sms: false, email: true },
          reminder_enable: true,
        });
      return {
        id: link.id,
        short_url: link.short_url,
        status: link.status,
        simulated: false,
      };
    }
    throw new Error("Razorpay Payment Links API is unavailable for the configured credentials");
  },

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Missing RAZORPAY_KEY_SECRET environment variable");
    }
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return safeCompare(generatedSignature, signature);
  },

  verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): boolean {
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(payload)
      .digest("hex");
    return safeCompare(generatedSignature, signature);
  },
};
