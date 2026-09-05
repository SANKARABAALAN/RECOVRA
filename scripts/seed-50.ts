import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load Environment Variables from .env.local first
function loadEnv() {
  try {
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
      console.log("Loaded environment variables from .env.local");
    }
  } catch (e) {
    console.error("Failed to load .env.local", e);
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Seeding database with 50 synthetic payments and dialogue history...");

  // Dynamically import recoveryService after env loaded
  const { recoveryService } = await import("../src/services/recovery.service");

  // 1. Fetch or create merchant
  const merchantEmail = "operator@recovra.sys";
  let merchantId = "";

  const { data: merchants, error: getMerchantError } = await supabase
    .from("merchants")
    .select("id")
    .eq("email", merchantEmail);

  if (getMerchantError) {
    console.error("Error fetching merchant:", getMerchantError);
    process.exit(1);
  }

  if (merchants && merchants.length > 0) {
    merchantId = merchants[0].id;
    console.log(`Using merchant ID: ${merchantId}`);
  } else {
    const { data: newMerchant, error: createMerchantError } = await supabase
      .from("merchants")
      .insert({
        name: "Acme Merchant",
        email: merchantEmail,
        business_name: "Acme Retail",
      })
      .select()
      .single();

    if (createMerchantError) {
      console.error("Error creating merchant:", createMerchantError);
      process.exit(1);
    }
    merchantId = newMerchant.id;
    console.log(`Created new merchant ID: ${merchantId}`);
  }

  // 2. Clean existing records
  console.log("Cleaning up existing data tables...");
  await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("recovery_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 3. Generate 50 payments
  const syntheticPayments: any[] = [];

  // Generate 20 Success
  for (let i = 1; i <= 20; i++) {
    const method = i % 3 === 0 ? "UPI" : i % 3 === 1 ? "Card" : "Net Banking";
    syntheticPayments.push({
      amount: Math.round(1500 + Math.random() * 8000),
      currency: "INR",
      payment_method: method,
      status: "Success",
      failure_reason: null,
    });
  }

  // Generate 5 Pending
  for (let i = 1; i <= 5; i++) {
    const method = i % 2 === 0 ? "UPI" : "Net Banking";
    syntheticPayments.push({
      amount: Math.round(500 + Math.random() * 5000),
      currency: "INR",
      payment_method: method,
      status: "Pending",
      failure_reason: null,
    });
  }

  // Failure categories mapped to realistic Razorpay errors
  const failureTypes = [
    { reason: "BAD_REQUEST_PAYMENT_DECLINED_BY_BANK", desc: "Insufficient Funds", method: "Card" },
    { reason: "BAD_REQUEST_PAYMENT_TIMED_OUT", desc: "Bank Timeout", method: "Card" },
    { reason: "GATEWAY_ERROR", desc: "Network Failure", method: "Net Banking" },
    { reason: "BAD_REQUEST_PAYMENT_EXPIRED", desc: "Expired Card", method: "Card" },
    { reason: "BAD_REQUEST_PAYMENT_RESTRICTED", desc: "Blocked Card", method: "Card" },
    { reason: "BAD_REQUEST_UPI_TIMEOUT", desc: "UPI Pending Timeout", method: "UPI" },
    { reason: "BAD_REQUEST_INCORRECT_PIN", desc: "Incorrect UPI PIN", method: "UPI" },
    { reason: "BAD_REQUEST_RISK_FLAG", desc: "Risk Decline", method: "Card" },
    { reason: "BAD_REQUEST_DUPLICATE", desc: "Duplicate Payment", method: "Card" },
    { reason: "BAD_REQUEST_CANCELLED_BY_USER", desc: "Customer Cancelled", method: "UPI" },
  ];

  // Generate 25 Failures
  for (let i = 1; i <= 25; i++) {
    const failDef = failureTypes[i % failureTypes.length];
    syntheticPayments.push({
      amount: Math.round(999 + Math.random() * 25000),
      currency: "INR",
      payment_method: failDef.method,
      status: "Failed",
      failure_reason: failDef.reason,
    });
  }

  // 4. Save to Database
  console.log(`Inserting ${syntheticPayments.length} records into public.payments...`);
  let failedCount = 0;
  let successCount = 0;

  // Track created cases to seed dialogues on them
  const createdCases: any[] = [];

  for (let i = 0; i < syntheticPayments.length; i++) {
    const p = syntheticPayments[i];
    const { data: paymentRecord, error } = await supabase
      .from("payments")
      .insert({
        merchant_id: merchantId,
        order_id: `order_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        payment_id: p.status === "Success" ? `pay_${Math.random().toString(36).substr(2, 12).toLowerCase()}` : null,
        amount: p.amount,
        currency: p.currency,
        payment_method: p.payment_method,
        status: p.status,
        failure_reason: p.failure_reason,
      })
      .select()
      .single();

    if (error) {
      console.error(`Error inserting payment record ${i}:`, error);
      continue;
    }

    if (paymentRecord.status === "Failed") {
      failedCount++;
      // Trigger dynamic failure detector
      try {
        const caseRecord = await recoveryService.processPaymentFailure(paymentRecord.id);
        if (caseRecord) {
          createdCases.push({
            caseId: caseRecord.id,
            reason: p.failure_reason,
            amount: p.amount,
            method: p.payment_method,
          });
        }
      } catch (err) {
        console.error(`Error executing Failure Detector on payment ${paymentRecord.id}:`, err);
      }
    } else if (paymentRecord.status === "Success") {
      successCount++;
    }
  }

  // 5. Seed dialogue histories for a few cases to provide dynamic conversational context
  console.log("\nSeeding conversation history on recovery cases...");
  const dialogues = [
    {
      intent: "WILL_PAY_TOMORROW",
      sentiment: "Neutral",
      messages: [
        { role: "customer", text: "I'll settle this bill tomorrow morning once my salary is credited." },
        { role: "assistant", text: "Understood. I will schedule a follow-up reminder for tomorrow morning at 09:00 AM." },
      ],
    },
    {
      intent: "CARD_EXPIRED",
      sentiment: "Confused",
      messages: [
        { role: "customer", text: "The transaction keeps failing. I think my credit card expired last month." },
        { role: "assistant", text: "Expired card detected. Please update your billing method details to resume recovery." },
      ],
    },
    {
      intent: "UPI_PROBLEM",
      sentiment: "Frustrated",
      messages: [
        { role: "customer", text: "I entered my PIN but the GPay overlay timed out." },
        { role: "assistant", text: "UPI transaction timed out. Rescheduling a fresh push notification retry." },
      ],
    },
    {
      intent: "REQUEST_HUMAN",
      sentiment: "Angry",
      messages: [
        { role: "customer", text: "This checkout screen is buggy. Get me a human support operator." },
        { role: "assistant", text: "Understood. Handoff to merchant triggered. A representative will contact you shortly." },
      ],
    },
  ];

  for (let idx = 0; idx < Math.min(createdCases.length, dialogues.length); idx++) {
    const targetCase = createdCases[idx];
    const dialogueDef = dialogues[idx];

    const serializedIntent = JSON.stringify({
      intent: dialogueDef.intent,
      sentiment: dialogueDef.sentiment,
    });

    for (const msg of dialogueDef.messages) {
      await supabase.from("conversations").insert({
        recovery_case_id: targetCase.caseId,
        role: msg.role,
        message: msg.text,
        detected_intent: serializedIntent,
        confidence_score: 95,
      });
    }

    // Write audit log entry
    await supabase.from("audit_logs").insert({
      recovery_case_id: targetCase.caseId,
      payment_id: null,
      actor: "SYSTEM",
      event_type: "Intent updated",
      reason: `Dialogue memory seeded. Intent: ${dialogueDef.intent}. Sentiment: ${dialogueDef.sentiment}.`,
      result: "Setup completed.",
      metadata: { intent: dialogueDef.intent, sentiment: dialogueDef.sentiment },
    });
  }

  console.log("\n--- Seeding Complete ---");
  console.log(`Total Payments Seeded: ${syntheticPayments.length}`);
  console.log(`- Success Payments: ${successCount}`);
  console.log(`- Failed Payments: ${failedCount}`);
  console.log(`- Pending Payments: 5`);
  console.log("Database seeded successfully.");
}

main().catch((err) => {
  console.error("Seed script crash:", err);
  process.exit(1);
});
