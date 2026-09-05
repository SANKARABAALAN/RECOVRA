import crypto from "crypto";
import fs from "fs";
import path from "path";

// 1. Load environment variables
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    });
  }
}
loadEnv();

const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "AcmeWebhookSecret";

async function main() {
  console.log("Starting Razorpay webhook integration tests...");

  // We will target the order we just set to Failed: 'order_TVXZ2D09LKl45x'
  const targetOrderId = "order_TVXZ2D09LKl45x";

  // Mock payload for payment.captured
  const payloadObj = {
    entity: "event",
    account_id: "acc_AcmeMerchant",
    event: "payment.captured",
    contains: ["payment"],
    payload: {
      payment: {
        entity: {
          id: "pay_test_captured_123",
          entity: "payment",
          amount: 49900,
          currency: "INR",
          status: "captured",
          order_id: targetOrderId,
          invoice_id: null,
          international: false,
          method: "upi",
          amount_refunded: 0,
          refund_status: null,
          captured: true,
          description: "Sandbox captured verification",
          card_id: null,
          bank: null,
          wallet: null,
          vpa: "customer@upi",
          email: "customer@upi.sys",
          contact: "+919999999999",
          error_code: null,
          error_description: null,
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const payload = JSON.stringify(payloadObj);

  // Calculate signature
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  console.log("Calculated signature:", signature);

  // TEST 1: Send webhook request with INVALID signature
  console.log("\n--- TEST 1: Sending request with invalid signature ---");
  const badRes = await fetch("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "bad_signature_value",
    },
    body: payload,
  });
  console.log("Status code received:", badRes.status);
  const badData = await badRes.json();
  console.log("Response body:", badData);

  // TEST 2: Send webhook request with VALID signature
  console.log("\n--- TEST 2: Sending request with valid signature ---");
  const goodRes = await fetch("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: payload,
  });
  console.log("Status code received:", goodRes.status);
  const goodData = await goodRes.json();
  console.log("Response body:", goodData);

  // TEST 3: Send duplicate webhook request (Idempotency check)
  console.log("\n--- TEST 3: Sending duplicate request (Idempotency) ---");
  const dupRes = await fetch("http://localhost:3000/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: payload,
  });
  console.log("Status code received:", dupRes.status);
  const dupData = await dupRes.json();
  console.log("Response body:", dupData);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
});
