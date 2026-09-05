import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
    }
  } catch (e) {
    console.error("Failed to load .env.local", e);
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runStressTest() {
  console.log("=================================================");
  console.log("   RECOVRA PHASE 11: HIGH-SCALE STRESS TEST      ");
  console.log("=================================================\n");

  const { demoService } = await import("../src/services/demo.service");
  const { automationService } = await import("../src/services/automation.service");

  // Step 1: Fetch merchant
  const { data: merchants } = await supabase.from("merchants").select("*").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("No merchant found.");
    process.exit(1);
  }
  const merchantId = merchants[0].id;

  console.log("Generating high-scale dataset...");
  console.log("- 500 Payments");
  console.log("- 250 Recovery Cases");
  console.log("- 1,000 Audit Events");
  console.log("- 300 Conversation Messages");

  const startTime = Date.now();
  const now = Date.now();

  // Generate 500 Payments in 10 batches of 50
  let totalPaymentsInserted = 0;
  let insertedPaymentIds: string[] = [];

  for (let batch = 0; batch < 10; batch++) {
    const pBatch = [];
    for (let i = 0; i < 50; i++) {
      pBatch.push({
        merchant_id: merchantId,
        order_id: `ord_stress_${now}_${batch}_${i}`,
        payment_id: `pay_stress_${now}_${batch}_${i}`,
        amount: Math.floor(Math.random() * 50000) + 199,
        currency: "INR",
        status: i % 2 === 0 ? "Failed" : "Completed",
        failure_reason: "Network Timeout",
        payment_method: "UPI",
      });
    }

    const { data: insertedP } = await supabase.from("payments").insert(pBatch).select("id");
    if (insertedP) {
      totalPaymentsInserted += insertedP.length;
      insertedPaymentIds.push(...insertedP.map((p) => p.id));
    }
  }

  console.log(`✓ Seeded ${totalPaymentsInserted} payments into Supabase.`);

  // Generate 250 Recovery Cases in 5 batches of 50
  let totalCasesInserted = 0;
  let insertedCaseIds: string[] = [];

  for (let batch = 0; batch < 5; batch++) {
    const cBatch = [];
    const pSlice = insertedPaymentIds.slice(batch * 50, (batch + 1) * 50);
    for (let i = 0; i < pSlice.length; i++) {
      cBatch.push({
        merchant_id: merchantId,
        payment_id: pSlice[i],
        recovery_status: i % 3 === 0 ? "Recovered" : "Active",
        current_stage: i % 3 === 0 ? "RECOVERED" : "WAITING",
        confidence_score: Math.floor(Math.random() * 40) + 60,
        recommended_action: "WAIT_AND_RETRY",
      });
    }

    const { data: insertedC } = await supabase.from("recovery_cases").insert(cBatch).select("id");
    if (insertedC) {
      totalCasesInserted += insertedC.length;
      insertedCaseIds.push(...insertedC.map((c) => c.id));
    }
  }

  console.log(`✓ Seeded ${totalCasesInserted} recovery cases into Supabase.`);

  // Generate 1,000 Audit Events in 10 batches of 100
  let totalAuditsInserted = 0;
  for (let batch = 0; batch < 10; batch++) {
    const aBatch = [];
    for (let i = 0; i < 100; i++) {
      const caseId = insertedCaseIds[i % insertedCaseIds.length] || null;
      aBatch.push({
        recovery_case_id: caseId,
        payment_id: null,
        actor: "SYSTEM",
        event_type: "STRESS_TEST_EVENT",
        reason: "High throughput stress benchmark event",
        result: "Logged",
      });
    }
    const { data: insertedA } = await supabase.from("audit_logs").insert(aBatch).select("id");
    if (insertedA) totalAuditsInserted += insertedA.length;
  }

  console.log(`✓ Seeded ${totalAuditsInserted} audit events into Supabase.`);

  // Generate 300 Conversations in 6 batches of 50
  let totalConvsInserted = 0;
  for (let batch = 0; batch < 6; batch++) {
    const convBatch = [];
    for (let i = 0; i < 50; i++) {
      const caseId = insertedCaseIds[(batch * 50 + i) % insertedCaseIds.length];
      convBatch.push({
        recovery_case_id: caseId,
        role: i % 2 === 0 ? "customer" : "assistant",
        message: `Stress test conversation message ${i}`,
        detected_intent: "PROMISE_TO_PAY",
      });
    }
    const { data: insertedConv } = await supabase.from("conversations").insert(convBatch).select("id");
    if (insertedConv) totalConvsInserted += insertedConv.length;
  }

  console.log(`✓ Seeded ${totalConvsInserted} conversation messages into Supabase.`);

  // Performance Benchmarking
  console.log("\n=================================================");
  console.log("           PERFORMANCE BENCHMARK RESULTS         ");
  console.log("=================================================");

  const t1 = Date.now();
  const { count: dbPayments } = await supabase.from("payments").select("*", { count: "exact", head: true });
  const latencyDashboard = Date.now() - t1;

  const t2 = Date.now();
  const { count: dbCases } = await supabase.from("recovery_cases").select("*", { count: "exact", head: true });
  const latencyIntelligence = Date.now() - t2;

  const t3 = Date.now();
  const workerStatus = automationService.getWorkerStatus();
  const latencyWorker = Date.now() - t3;

  console.log(`Dashboard Query Latency      : ${latencyDashboard} ms`);
  console.log(`Intelligence Query Latency   : ${latencyIntelligence} ms`);
  console.log(`Worker Status Check Latency  : ${latencyWorker} ms`);
  console.log(`Total Database Payments      : ${dbPayments}`);
  console.log(`Total Database Cases         : ${dbCases}`);
  console.log("=================================================\n");

  console.log("STRESS TEST COMPLETED SUCCESSFULLY!");
}

runStressTest().catch((e) => {
  console.error("Stress test failed:", e);
  process.exit(1);
});
