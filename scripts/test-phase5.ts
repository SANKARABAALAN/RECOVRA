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

async function runPhase5SelfTests() {
  console.log("==========================================");
  console.log("  RECOVRA PHASE 5 MANDATORY SELF-TESTS");
  console.log("==========================================\n");

  const { recoveryService } = await import("../src/services/recovery.service");

  const testResults = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
    test6: false,
    test7: false,
  };

  // Get merchant ID
  const { data: merchants } = await supabase.from("merchants").select("id").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("Please seed merchant records first.");
    process.exit(1);
  }
  const testMerchantId = merchants[0].id;

  // --- TEST 1: Create a failed payment -> Recovery case created ---
  console.log("1. Running Test 1: Create a failed payment...");
  const orderId = `order_P5_TEST_${Date.now()}`;
  const { data: testPayment, error: payErr } = await supabase
    .from("payments")
    .insert({
      merchant_id: testMerchantId,
      order_id: orderId,
      amount: 1499,
      currency: "INR",
      status: "Failed",
      failure_reason: "BAD_REQUEST_PAYMENT_TIMED_OUT",
      payment_method: "Card",
    })
    .select()
    .single();

  if (payErr || !testPayment) {
    console.error("Test 1 Error inserting payment:", payErr);
  } else {
    const newCase = await recoveryService.processPaymentFailure(testPayment.id);
    if (newCase && newCase.current_stage === "DETECTED" && newCase.recovery_status === "ACTIVE") {
      testResults.test1 = true;
      console.log(`✓ Test 1 PASS: Recovery case ${newCase.id} created with stage=DETECTED, status=ACTIVE.`);
    } else {
      console.log("✗ Test 1 FAIL: Case not created or stage mismatch.");
    }
  }

  // --- TEST 2: Send duplicate failed webhook -> No duplicate recovery case ---
  console.log("\n2. Running Test 2: Send duplicate failed payment notification...");
  if (testPayment) {
    const dupCase = await recoveryService.processPaymentFailure(testPayment.id);
    const { data: allCasesForPayment } = await supabase
      .from("recovery_cases")
      .select("id")
      .eq("payment_id", testPayment.id);

    if (allCasesForPayment && allCasesForPayment.length === 1) {
      testResults.test2 = true;
      console.log(`✓ Test 2 PASS: No duplicate recovery case created. Single case ID retained.`);
    } else {
      console.log(`✗ Test 2 FAIL: Found ${allCasesForPayment?.length} cases for same payment.`);
    }
  }

  // --- TEST 3: Advance through valid stages ---
  console.log("\n3. Running Test 3: Advance through valid stages (DETECTED -> DIAGNOSING -> EVALUATING -> DECIDED -> WAITING)...");
  if (testResults.test1) {
    const { data: c } = await supabase.from("recovery_cases").select("*").eq("payment_id", testPayment.id).single();
    try {
      await recoveryService.transitionStage(c.id, "DIAGNOSING");
      await recoveryService.transitionStage(c.id, "EVALUATING");
      await recoveryService.transitionStage(c.id, "DECIDED");
      const finalVal = await recoveryService.transitionStage(c.id, "WAITING");

      if (finalVal.current_stage === "WAITING") {
        testResults.test3 = true;
        console.log("✓ Test 3 PASS: Successfully transitioned through DETECTED -> DIAGNOSING -> EVALUATING -> DECIDED -> WAITING.");
      }
    } catch (e: any) {
      console.log("✗ Test 3 FAIL:", e.message);
    }
  }

  // --- TEST 4: Attempt invalid transition ---
  console.log("\n4. Running Test 4: Attempt invalid transition (WAITING -> DETECTED)...");
  if (testResults.test1) {
    const { data: c } = await supabase.from("recovery_cases").select("*").eq("payment_id", testPayment.id).single();
    try {
      await recoveryService.transitionStage(c.id, "DETECTED");
      console.log("✗ Test 4 FAIL: Invalid transition was incorrectly allowed!");
    } catch (e: any) {
      testResults.test4 = true;
      console.log(`✓ Test 4 PASS: Invalid transition rejected with error: "${e.message}".`);
    }
  }

  // --- TEST 5: Schedule retries until limit ---
  console.log("\n5. Running Test 5: Schedule retries until max retries limit...");
  if (testResults.test1) {
    // Create isolated case for retry limit testing
    const { data: retryPay } = await supabase
      .from("payments")
      .insert({
        merchant_id: testMerchantId,
        order_id: `order_RETRY_LIM_${Date.now()}`,
        amount: 2999,
        currency: "INR",
        status: "Failed",
        failure_reason: "INSUFFICIENT_FUNDS",
      })
      .select()
      .single();

    const retryCase = await recoveryService.processPaymentFailure(retryPay.id);
    let blockedCount = 0;

    for (let i = 0; i < 6; i++) {
      try {
        await recoveryService.scheduleRetry(retryCase.id, 2);
      } catch (err: any) {
        if (err.message.includes("Maximum retries limit")) {
          blockedCount++;
        }
      }
    }

    const { data: closedCheck } = await supabase
      .from("recovery_cases")
      .select("current_stage, recovery_status")
      .eq("id", retryCase.id)
      .single();

    if (blockedCount > 0 && closedCheck?.current_stage === "CLOSED") {
      testResults.test5 = true;
      console.log(`✓ Test 5 PASS: Scheduling blocked after max retries limit (4). Case stage set to CLOSED.`);
    } else {
      console.log(`✗ Test 5 FAIL: Blocked count: ${blockedCount}, Stage: ${closedCheck?.current_stage}`);
    }

    // Clean up retry pay
    await supabase.from("payments").delete().eq("id", retryPay.id);
  }

  // --- TEST 6: Verify dashboard / cases data loads from Supabase ---
  console.log("\n6. Running Test 6: Verify cases load from Supabase...");
  const casesData = await recoveryService.getRecoveryCases();
  const metricsData = await recoveryService.getRecoveryMetrics();

  if (Array.isArray(casesData) && metricsData.totalCases !== undefined) {
    testResults.test6 = true;
    console.log(`✓ Test 6 PASS: Recovery cases loaded (${casesData.length} total, ${metricsData.activeCases} active, ${metricsData.waitingCases} waiting, ${metricsData.closedCases} closed).`);
  } else {
    console.log("✗ Test 6 FAIL: Cases loading returned invalid format.");
  }

  // --- TEST 7: Verify audit logs exist for every recovery action ---
  console.log("\n7. Running Test 7: Verify audit logs exist for recovery actions...");
  if (testResults.test1) {
    const { data: c } = await supabase.from("recovery_cases").select("*").eq("payment_id", testPayment.id).single();
    const { data: audits } = await supabase.from("audit_logs").select("event_type").eq("recovery_case_id", c.id);
    const eventTypes = (audits || []).map((a) => a.event_type);

    if (eventTypes.includes("CASE_CREATED") && eventTypes.includes("STAGE_CHANGED")) {
      testResults.test7 = true;
      console.log(`✓ Test 7 PASS: Audit events recorded (${eventTypes.join(", ")}).`);
    } else {
      console.log(`✗ Test 7 FAIL: Audit events missing. Found: ${eventTypes.join(", ")}`);
    }
  }

  // Clean up main test payment
  if (testPayment) {
    await supabase.from("payments").delete().eq("id", testPayment.id);
  }

  // SUMMARY REPORT
  console.log("\n==========================================");
  console.log("  PHASE 5 TEST RESULTS SUMMARY");
  console.log("==========================================");
  console.log(`Test 1 (Automatic Case Creation) : ${testResults.test1 ? "PASS" : "FAIL"}`);
  console.log(`Test 2 (Duplicate Prevention)    : ${testResults.test2 ? "PASS" : "FAIL"}`);
  console.log(`Test 3 (Valid Transitions)       : ${testResults.test3 ? "PASS" : "FAIL"}`);
  console.log(`Test 4 (Invalid Transitions Error): ${testResults.test4 ? "PASS" : "FAIL"}`);
  console.log(`Test 5 (Retry Limits Blocked)    : ${testResults.test5 ? "PASS" : "FAIL"}`);
  console.log(`Test 6 (Dashboard / Cases Fetch) : ${testResults.test6 ? "PASS" : "FAIL"}`);
  console.log(`Test 7 (Audit Logs Integrated)   : ${testResults.test7 ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");

  const allPassed = Object.values(testResults).every(Boolean);
  if (allPassed) {
    console.log("ALL 7 PHASE 5 SELF-TESTS PASSED!");
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runPhase5SelfTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
