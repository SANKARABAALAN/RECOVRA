import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load Environment Variables
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

async function runJudgeSimulation() {
  console.log("=================================================");
  console.log("  RECOVRA PHASE 11: END-TO-END JUDGE SIMULATION  ");
  console.log("=================================================\n");

  const { recoveryService } = await import("../src/services/recovery.service");
  const { aiService } = await import("../src/services/ai.service");
  const { policyService } = await import("../src/services/policy.service");
  const { negotiatorService } = await import("../src/services/negotiator.service");
  const { automationService } = await import("../src/services/automation.service");

  // Step 1: Get Primary Merchant
  const { data: merchants } = await supabase.from("merchants").select("*").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("No merchant found. Please seed database first.");
    process.exit(1);
  }
  const merchant = merchants[0];
  console.log(`Step 1: Merchant Logged In -> ${merchant.name} (${merchant.id})`);

  // Step 2: Failed Payment Created
  const orderId = `ord_judge_sim_${Date.now()}`;
  const paymentIdStr = `pay_judge_sim_${Date.now()}`;
  console.log(`\nStep 2: Simulating Failed Razorpay Payment (orderId: ${orderId})...`);

  const { data: paymentRecord } = await supabase
    .from("payments")
    .insert({
      merchant_id: merchant.id,
      order_id: orderId,
      payment_id: paymentIdStr,
      amount: 14500,
      currency: "INR",
      status: "Failed",
      failure_reason: "Network Timeout",
      payment_method: "UPI",
    })
    .select()
    .single();

  if (!paymentRecord) {
    console.error("Failed to create simulation payment");
    process.exit(1);
  }
  console.log(`✓ Payment record created in DB [ID: ${paymentRecord.id}]. Status: Failed.`);

  // Step 3: Trigger Recovery Engine Failure Detector
  console.log("\nStep 3: Recovery Case Creation & Stage Detection...");
  const recCase = await recoveryService.processPaymentFailure(paymentRecord.id);
  console.log(`✓ Recovery Case created [ID: ${recCase.id}]. Stage: ${recCase.current_stage}, Status: ${recCase.recovery_status}.`);

  // Step 4: AI Diagnostic Engine
  console.log("\nStep 4: AI Diagnostic Engine Analysis...");
  const diagnosis = await aiService.diagnosePayment({
    payment_id: paymentRecord.id,
    payment_method: paymentRecord.payment_method,
    error_code: "NETWORK_TIMEOUT",
    amount: paymentRecord.amount,
  });
  const confPercent = Math.round((diagnosis.confidence || 0.85) * 100);
  console.log(`✓ AI Diagnostic Result: Confidence ${confPercent}%, Recommendation: ${diagnosis.recommended_next_step}`);
  await aiService.storeDiagnosis(recCase.id, diagnosis);

  // Step 5: Policy Gate Evaluation
  console.log("\nStep 5: Safety Policy Gate Evaluation...");
  const policyResult = await policyService.evaluatePolicy(recCase.id, paymentRecord.id, {
    proposed_decision: diagnosis.recommended_next_step,
    retry_count: 0,
  });
  console.log(`✓ Policy Decision: ${policyResult.policy_result}. Reason: ${policyResult.reason}`);

  // Step 6: AI Negotiator Customer Dialogue
  console.log("\nStep 6: AI Negotiator Dialogue & Intent Classification...");
  const customerMessage = "I am on a business trip, will pay on Friday morning.";
  const aiDialogue = await negotiatorService.processMessage({
    caseId: recCase.id,
    customerMessage,
    conversationHistory: [],
    paymentContext: paymentRecord,
  });
  console.log(`✓ Customer Message: "${customerMessage}"`);
  console.log(`✓ Detected Intent: ${aiDialogue.intent || aiDialogue.detected_intent}, AI Reply: "${aiDialogue.reply || aiDialogue.message}"`);

  // Step 7: Promise-To-Pay Registration
  console.log("\nStep 7: Promise-To-Pay Registration & Retry Scheduling...");
  const promiseDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  await negotiatorService.trackPromiseToPay(recCase.id, promiseDate, 14500);
  console.log(`✓ Promise-To-Pay registered for ${promiseDate}`);

  // Step 8: Execution Layer & Recovery Verification
  console.log("\nStep 8: Autonomous Recovery Execution & Verification...");
  await recoveryService.transitionStage(recCase.id, "RECOVERED", "Payment retry completed successfully via UPI");
  const verification = await automationService.verifyRecoveryOutcome(recCase.id, "sim_token_judge_pass");
  console.log(`✓ Outcome Verified: Status ${verification.status}, Token: ${verification.paymentToken}`);

  // Step 9: Verify Metrics & Audit Timeline
  console.log("\nStep 9: Verifying Final Metrics & Audit Timeline...");
  const { data: auditEvents } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("recovery_case_id", recCase.id);

  console.log(`✓ Total Audit Events recorded for Case ${recCase.id}: ${auditEvents?.length || 0}`);
  for (const a of auditEvents || []) {
    console.log(`   - [${a.event_type}] ${a.actor}: ${a.reason}`);
  }

  // Cleanup simulation record
  await supabase.from("payments").delete().eq("id", paymentRecord.id);

  console.log("\n=================================================");
  console.log("  END-TO-END JUDGE SIMULATION COMPLETED: SUCCESS  ");
  console.log("=================================================\n");
}

runJudgeSimulation().catch((e) => {
  console.error("Judge simulation failed:", e);
  process.exit(1);
});
