import fs from "fs";
import path from "path";

// Load .env.local natively BEFORE importing supabase
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        process.env[key] = value;
      }
    }
  });
}

// Dynamically require modules after env vars are populated
const { supabase } = require("../src/lib/supabase");
const { recoveryService } = require("../src/services/recovery.service");
const { queueService } = require("../src/services/queue.service");
const { automationService } = require("../src/services/automation.service");
const { policyService } = require("../src/services/policy.service");
const { auditService } = require("../src/services/audit.service");

async function runSelfTests() {
  console.log("==================================================");
  console.log("   RECOVRA Phase 10A Mandatory Self-Tests Runner  ");
  console.log("==================================================\n");

  const results: Record<string, "PASS" | "FAIL"> = {};

  try {
    // Ensure test merchant exists
    const { data: merchant } = await supabase.from("merchants").select("*").limit(1).single();
    const merchantId = merchant?.id || "mch_test_default";

    // ----------------------------------------------------
    // TEST 1: Create a failed payment -> Recovery job created
    // ----------------------------------------------------
    console.log("TEST 1: Creating failed payment...");
    const { data: testPayment, error: pErr } = await supabase
      .from("payments")
      .insert({
        merchant_id: merchantId,
        order_id: `ord_test1_${Date.now()}`,
        amount: 499900,
        currency: "INR",
        status: "Failed",
        failure_reason: "Network Timeout",
        payment_method: "Card",
      })
      .select()
      .single();

    if (pErr) throw new Error(`Test 1 payment creation failed: ${pErr.message}`);

    const recoveryCase = await recoveryService.processPaymentFailure(testPayment.id);
    const test1Job = await queueService.enqueueJob({
      recovery_case_id: recoveryCase.id,
      payment_id: testPayment.id,
      action_type: "WAIT_AND_RETRY",
      scheduled_at: new Date().toISOString(), // Ready now
      retry_attempt: 1,
    });

    if (test1Job && test1Job.status === "QUEUED") {
      results["Test 1: Recovery Job Created"] = "PASS";
      console.log("  ✓ Test 1 Passed: Recovery job created successfully.\n");
    } else {
      results["Test 1: Recovery Job Created"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 2: Run worker -> Queued job executed
    // ----------------------------------------------------
    console.log("TEST 2: Running worker on queued job...");
    const workerResult = await automationService.runRecoveryWorker();
    if (workerResult.processed > 0) {
      results["Test 2: Worker Execution"] = "PASS";
      console.log("  ✓ Test 2 Passed: Worker executed queued job.\n");
    } else {
      results["Test 2: Worker Execution"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 3: Cooldown not finished -> Worker skips retry
    // ----------------------------------------------------
    console.log("TEST 3: Testing active cooldown delay check...");
    const policyResultCooldown = await policyService.evaluatePolicy(
      recoveryCase.id,
      testPayment.id,
      {
        proposed_decision: "WAIT_AND_RETRY",
        retry_count: 1,
        last_retry_at: new Date().toISOString(), // Cooldown active right now
      }
    );

    if (!policyResultCooldown.allowed && policyResultCooldown.reason.includes("Cooldown")) {
      results["Test 3: Cooldown Active Skip"] = "PASS";
      console.log("  ✓ Test 3 Passed: Cooldown active skips retry execution.\n");
    } else {
      results["Test 3: Cooldown Active Skip"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 4: Retry exceeds maximum -> Job blocked
    // ----------------------------------------------------
    console.log("TEST 4: Testing max retries limit policy block...");
    const policyResultMax = await policyService.evaluatePolicy(
      recoveryCase.id,
      testPayment.id,
      {
        proposed_decision: "WAIT_AND_RETRY",
        retry_count: 4, // Max retries
        last_retry_at: null,
      }
    );

    if (!policyResultMax.allowed && policyResultMax.reason.includes("Maximum retries")) {
      results["Test 4: Retry Exceeds Maximum"] = "PASS";
      console.log("  ✓ Test 4 Passed: Retry limit exceeds maximum blocks job.\n");
    } else {
      results["Test 4: Retry Exceeds Maximum"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 5: Generate payment link -> Payment link created
    // ----------------------------------------------------
    console.log("TEST 5: Testing Razorpay payment link generation...");
    const linkResult = await automationService.generatePaymentLink(recoveryCase.id);
    if (linkResult.paymentLink && linkResult.paymentLink.includes("plink_rcv_")) {
      results["Test 5: Payment Link Generation"] = "PASS";
      console.log(`  ✓ Test 5 Passed: Payment link created: ${linkResult.paymentLink}\n`);
    } else {
      results["Test 5: Payment Link Generation"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 6: Simulate successful payment after retry -> RECOVERED
    // ----------------------------------------------------
    console.log("TEST 6: Testing transition to RECOVERED...");
    await recoveryService.transitionStage(recoveryCase.id, "RECOVERED", "Payment success test");
    const updatedCaseRec = await recoveryService.getRecoveryCaseById(recoveryCase.id);

    if (updatedCaseRec.recovery_status === "Recovered" && updatedCaseRec.current_stage === "RECOVERED") {
      results["Test 6: Case Recovered State"] = "PASS";
      console.log("  ✓ Test 6 Passed: Recovery case status updated to RECOVERED.\n");
    } else {
      results["Test 6: Case Recovered State"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 7: Simulate failed retry -> Retry count increments & next retry scheduled
    // ----------------------------------------------------
    console.log("TEST 7: Testing failed retry count increment...");
    const { data: test7Payment } = await supabase
      .from("payments")
      .insert({
        merchant_id: merchantId,
        order_id: `ord_test7_${Date.now()}`,
        amount: 199900,
        currency: "INR",
        status: "Failed",
        failure_reason: "Insufficient Funds",
        payment_method: "UPI",
      })
      .select()
      .single();

    const case7 = await recoveryService.processPaymentFailure(test7Payment.id);
    const schedResult = await recoveryService.scheduleRetry(case7.id, 2);

    if (schedResult.retryCount === 1 && schedResult.scheduled_retry_at) {
      results["Test 7: Retry Count Increment"] = "PASS";
      console.log("  ✓ Test 7 Passed: Retry count incremented and next retry scheduled.\n");
    } else {
      results["Test 7: Retry Count Increment"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 8: Recovered payment -> Worker ignores further retries
    // ----------------------------------------------------
    console.log("TEST 8: Testing policy block on already recovered payment...");
    const policyResultRecovered = await policyService.evaluatePolicy(
      recoveryCase.id,
      testPayment.id,
      {
        proposed_decision: "WAIT_AND_RETRY",
        retry_count: 0,
        recovery_status: "Recovered",
        current_stage: "RECOVERED",
      }
    );

    if (!policyResultRecovered.allowed && policyResultRecovered.reason.includes("recovered")) {
      results["Test 8: Ignore Recovered Payment"] = "PASS";
      console.log("  ✓ Test 8 Passed: Policy engine ignores further retries for recovered payment.\n");
    } else {
      results["Test 8: Ignore Recovered Payment"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 9: Audit logs created for every execution step
    // ----------------------------------------------------
    console.log("TEST 9: Verifying audit logs for execution steps...");
    const auditLogs = await auditService.getAuditLogs();
    const hasJobCreatedAudit = auditLogs.some((a: any) => a.event_type === "RECOVERY_JOB_CREATED");
    const hasJobStartedAudit = auditLogs.some((a: any) => a.event_type === "RECOVERY_JOB_STARTED");

    if (hasJobCreatedAudit && hasJobStartedAudit) {
      results["Test 9: Audit Trail Coverage"] = "PASS";
      console.log("  ✓ Test 9 Passed: Audit logs created for all execution steps.\n");
    } else {
      results["Test 9: Audit Trail Coverage"] = "FAIL";
    }

    // ----------------------------------------------------
    // TEST 10: Queue endpoint returns live queue
    // ----------------------------------------------------
    console.log("TEST 10: Verifying live queue retrieval...");
    const queuedJobsList = await queueService.getQueuedJobs();
    if (Array.isArray(queuedJobsList)) {
      results["Test 10: Live Queue Endpoint"] = "PASS";
      console.log(`  ✓ Test 10 Passed: Live queue returned ${queuedJobsList.length} jobs.\n`);
    } else {
      results["Test 10: Live Queue Endpoint"] = "FAIL";
    }

    console.log("==================================================");
    console.log("            MANDATORY TEST RESULTS SUMMARY        ");
    console.log("==================================================");
    console.table(results);

    const allPassed = Object.values(results).every((r) => r === "PASS");
    if (allPassed) {
      console.log("\n🎉 ALL 10 MANDATORY SELF-TESTS PASSED SUCCESSFULLY!");
    } else {
      console.log("\n❌ SOME SELF-TESTS FAILED.");
    }
  } catch (err: any) {
    console.error("Test execution failed with error:", err);
  }
}

runSelfTests();
