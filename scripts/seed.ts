import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Load Environment Variables from .env.local
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
    } else {
      console.warn(".env.local file not found. Make sure environment variables are set.");
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
  console.log("Starting database seed script...");

  // 2. Fetch or create default merchant
  const merchantEmail = "operator@recovra.sys";
  let merchantId = "";

  const { data: existingMerchants, error: getMerchantError } = await supabase
    .from("merchants")
    .select("id")
    .eq("email", merchantEmail);

  if (getMerchantError) {
    console.error("Error fetching merchant:", getMerchantError);
    process.exit(1);
  }

  if (existingMerchants && existingMerchants.length > 0) {
    merchantId = existingMerchants[0].id;
    console.log(`Using existing merchant ID: ${merchantId}`);
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

  // 3. Clear existing payments, recovery cases, and audit logs (Clean Seed)
  console.log("Cleaning up existing seed records...");
  await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("recovery_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // 4. Set up 15 payments
  const paymentsData = [
    // 8 Successful payments
    { amount: 4250.0, method: "UPI", status: "Success", reason: null },
    { amount: 12000.0, method: "Card", status: "Success", reason: null },
    { amount: 1500.0, method: "Net Banking", status: "Success", reason: null },
    { amount: 8900.0, method: "UPI", status: "Success", reason: null },
    { amount: 2300.0, method: "Card", status: "Success", reason: null },
    { amount: 18400.0, method: "Net Banking", status: "Success", reason: null },
    { amount: 950.0, method: "UPI", status: "Success", reason: null },
    { amount: 5600.0, method: "Card", status: "Success", reason: null },

    // 2 Pending payments
    { amount: 3500.0, method: "UPI", status: "Pending", reason: null },
    { amount: 15400.0, method: "Net Banking", status: "Pending", reason: null },

    // 5 Failed payments
    {
      amount: 50000.0,
      method: "Card",
      status: "Failed",
      reason: "Insufficient Funds",
      stage: "Diagnosing",
      recStatus: "Diagnosing",
      score: 94,
      action: "Retry later (T+2 Hrs)",
    },
    {
      amount: 1245.0,
      method: "Card",
      status: "Failed",
      reason: "Expired Card",
      stage: "Negotiate",
      recStatus: "Negotiating",
      score: 62,
      action: "AI Negotiation",
    },
    {
      amount: 8500.0,
      method: "UPI",
      status: "Failed",
      reason: "Network Timeout",
      stage: "Decide",
      recStatus: "Recovery Pending",
      score: 99,
      action: "Retry later (T+1 Hr)",
    },
    {
      amount: 2100.0,
      method: "UPI",
      status: "Failed",
      reason: "Fraud Suspected",
      stage: "Decide",
      recStatus: "Blocked",
      score: 12,
      action: "Freeze/Merchant Review",
    },
    {
      amount: 6200.0,
      method: "Card",
      status: "Failed",
      reason: "Authentication Failed",
      stage: "Diagnose",
      recStatus: "Exception",
      score: 78,
      action: "Merchant Review Required",
    },
  ];

  console.log("Inserting 15 payments...");
  for (let i = 0; i < paymentsData.length; i++) {
    const p = paymentsData[i];
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("payments")
      .insert({
        merchant_id: merchantId,
        order_id: `order_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        payment_id: `pay_${Math.random().toString(36).substr(2, 12).toLowerCase()}`,
        amount: p.amount,
        currency: "INR",
        payment_method: p.method,
        status: p.status,
        failure_reason: p.reason,
      })
      .select()
      .single();

    if (paymentError) {
      console.error(`Error inserting payment ${i}:`, paymentError);
      continue;
    }

    // If it's a failed payment, insert the recovery case and audit logs
    if (p.status === "Failed" && p.stage && p.recStatus) {
      const { data: caseRecord, error: caseError } = await supabase
        .from("recovery_cases")
        .insert({
          payment_id: paymentRecord.id,
          merchant_id: merchantId,
          current_stage: p.stage,
          recovery_status: p.recStatus,
          confidence_score: p.score,
          recommended_action: p.action,
          customer_intent: null,
          scheduled_retry_at:
            p.recStatus === "Recovery Pending"
              ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // Scheduled 2hr from now
              : null,
        })
        .select()
        .single();

      if (caseError) {
        console.error(`Error creating recovery case for payment ${paymentRecord.id}:`, caseError);
        continue;
      }

      console.log(`Created Recovery Case ${caseRecord.id} for payment ${paymentRecord.payment_id}`);

      // Insert matching initial audit logs
      const auditEvents = [
        {
          recovery_case_id: caseRecord.id,
          payment_id: paymentRecord.id,
          actor: "SYSTEM",
          event_type: "Payment failure detected",
          reason: `Razorpay webhook payment.failed triggered. Reason: ${p.reason}`,
          result: `Case created with ID ${caseRecord.id}`,
          metadata: { failure_reason: p.reason },
        },
        {
          recovery_case_id: caseRecord.id,
          payment_id: paymentRecord.id,
          actor: "AI_ENGINE",
          event_type: "AI diagnosis generated",
          reason: `Model RecovNet-v3 executed on failure code.`,
          result: `Identified success probability: ${p.score}%. Selected action: ${p.action}`,
          metadata: { confidence_score: p.score },
        },
      ];

      const { error: auditError } = await supabase.from("audit_logs").insert(auditEvents);
      if (auditError) {
        console.error(`Error creating audit logs for case ${caseRecord.id}:`, auditError);
      }
    }
  }

  console.log("Database seed script completed successfully.");
}

main().catch((err) => {
  console.error("Error executing database seed script:", err);
  process.exit(1);
});
