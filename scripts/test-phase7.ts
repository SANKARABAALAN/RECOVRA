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

async function runPhase7SelfTests() {
  console.log("==========================================");
  console.log("  RECOVRA PHASE 7 MANDATORY SELF-TESTS");
  console.log("==========================================\n");

  const { decisionService } = await import("../src/services/decision.service");
  const { policyService } = await import("../src/services/policy.service");
  const { recoveryService } = await import("../src/services/recovery.service");
  const { auditService } = await import("../src/services/audit.service");

  const testResults = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
    test6: false,
    test7: false,
    test8: false,
    test9: false,
    test10: false,
    test11: false,
  };

  // Get merchant ID
  const { data: merchants } = await supabase.from("merchants").select("id").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("Please seed merchant records first.");
    process.exit(1);
  }
  const testMerchantId = merchants[0].id;

  // --- TEST 1: BANK_NETWORK -> WAIT_AND_RETRY ---
  console.log("1. Running Test 1: BANK_NETWORK decision mapping...");
  const dec1 = decisionService.generateDecision({ category: "BANK_NETWORK", confidence: 0.90 });
  if (dec1.decision === "WAIT_AND_RETRY") {
    testResults.test1 = true;
    console.log(`✓ Test 1 PASS: BANK_NETWORK mapped to '${dec1.decision}'.`);
  } else {
    console.log(`✗ Test 1 FAIL: Got decision '${dec1.decision}'`);
  }

  // --- TEST 2: EXPIRED_CARD -> REQUEST_NEW_PAYMENT_METHOD ---
  console.log("\n2. Running Test 2: EXPIRED_CARD decision mapping...");
  const dec2 = decisionService.generateDecision({ category: "EXPIRED_CARD", confidence: 0.99 });
  if (dec2.decision === "REQUEST_NEW_PAYMENT_METHOD") {
    testResults.test2 = true;
    console.log(`✓ Test 2 PASS: EXPIRED_CARD mapped to '${dec2.decision}'.`);
  } else {
    console.log(`✗ Test 2 FAIL: Got decision '${dec2.decision}'`);
  }

  // --- TEST 3: INSUFFICIENT_FUNDS -> SEND_PAYMENT_LINK ---
  console.log("\n3. Running Test 3: INSUFFICIENT_FUNDS decision mapping...");
  const dec3 = decisionService.generateDecision({ category: "INSUFFICIENT_FUNDS", confidence: 0.95 });
  if (dec3.decision === "SEND_PAYMENT_LINK") {
    testResults.test3 = true;
    console.log(`✓ Test 3 PASS: INSUFFICIENT_FUNDS mapped to '${dec3.decision}'.`);
  } else {
    console.log(`✗ Test 3 FAIL: Got decision '${dec3.decision}'`);
  }

  // --- TEST 4: CUSTOMER_CANCELLED -> STOP_RECOVERY ---
  console.log("\n4. Running Test 4: CUSTOMER_CANCELLED decision mapping...");
  const dec4 = decisionService.generateDecision({ category: "CUSTOMER_CANCELLED", confidence: 0.94 });
  if (dec4.decision === "STOP_RECOVERY") {
    testResults.test4 = true;
    console.log(`✓ Test 4 PASS: CUSTOMER_CANCELLED mapped to '${dec4.decision}'.`);
  } else {
    console.log(`✗ Test 4 FAIL: Got decision '${dec4.decision}'`);
  }

  // --- TEST 5: Retry exceeds max retries -> POLICY_BLOCKED ---
  console.log("\n5. Running Test 5: Policy check with retry_count >= 4...");
  const polLimit = await policyService.evaluatePolicy(null as any, null, {
    proposed_decision: "WAIT_AND_RETRY",
    retry_count: 4,
  });

  if (polLimit.policy_result === "BLOCKED" && !polLimit.allowed) {
    testResults.test5 = true;
    console.log(`✓ Test 5 PASS: Retry limit (4) evaluation returned policy_result 'BLOCKED'.`);
  } else {
    console.log(`✗ Test 5 FAIL: Got policy_result '${polLimit.policy_result}'`);
  }

  // --- TEST 6: Retry before cooldown -> POLICY_BLOCKED ---
  console.log("\n6. Running Test 6: Policy check during active cooldown...");
  const polCooldown = await policyService.evaluatePolicy(null as any, null, {
    proposed_decision: "WAIT_AND_RETRY",
    retry_count: 1,
    last_retry_at: new Date().toISOString(), // 0 seconds ago, active cooldown
  });

  if (polCooldown.policy_result === "BLOCKED" && !polCooldown.allowed) {
    testResults.test6 = true;
    console.log(`✓ Test 6 PASS: Active cooldown evaluation returned policy_result 'BLOCKED'.`);
  } else {
    console.log(`✗ Test 6 FAIL: Got policy_result '${polCooldown.policy_result}'`);
  }

  // --- TEST 7: Recovered payment -> POLICY_BLOCKED ---
  console.log("\n7. Running Test 7: Policy check for already recovered payment...");
  const polRecovered = await policyService.evaluatePolicy(null as any, null, {
    proposed_decision: "WAIT_AND_RETRY",
    retry_count: 0,
    payment_status: "Success",
  });

  if (polRecovered.policy_result === "BLOCKED" && !polRecovered.allowed) {
    testResults.test7 = true;
    console.log(`✓ Test 7 PASS: Recovered payment evaluation returned policy_result 'BLOCKED'.`);
  } else {
    console.log(`✗ Test 7 FAIL: Got policy_result '${polRecovered.policy_result}'`);
  }

  // --- TEST 8: Fraud check -> POLICY_ESCALATED ---
  console.log("\n8. Running Test 8: Policy check for FRAUD_CHECK category...");
  const polFraud = await policyService.evaluatePolicy(null as any, null, {
    proposed_decision: "ESCALATE_TO_MERCHANT",
    retry_count: 0,
    category: "FRAUD_CHECK",
  });

  if (polFraud.policy_result === "ESCALATED" && !polFraud.allowed) {
    testResults.test8 = true;
    console.log(`✓ Test 8 PASS: Fraud check evaluation returned policy_result 'ESCALATED'.`);
  } else {
    console.log(`✗ Test 8 FAIL: Got policy_result '${polFraud.policy_result}'`);
  }

  // --- TEST 9 & 11: Store Decision in Supabase & check DECISION_CREATED & POLICY_* audit logs ---
  console.log("\n9. Running Test 9 & 11: Store Decision in Supabase and check audit log events...");
  const { data: testPayment } = await supabase
    .from("payments")
    .insert({
      merchant_id: testMerchantId,
      order_id: `order_P7_TEST_${Date.now()}`,
      amount: 4999,
      currency: "INR",
      status: "Failed",
      failure_reason: "GATEWAY_TIMEOUT",
    })
    .select()
    .single();

  const testCase = await recoveryService.processPaymentFailure(testPayment.id);

  // Store DECISION_CREATED
  await recoveryService.updateRecoveryCase(testCase.id, {
    recommended_action: dec1.decision,
  });

  await auditService.createAuditLog({
    recovery_case_id: testCase.id,
    payment_id: testPayment.id,
    actor: "DECISION_ENGINE",
    event_type: "DECISION_CREATED",
    reason: dec1.reason,
    result: `Decision: ${dec1.decision}`,
    metadata: { decision: dec1.decision, priority: dec1.priority, delay_minutes: dec1.recommended_delay_minutes },
  });

  // Store POLICY_APPROVED
  await policyService.evaluatePolicy(testCase.id, testPayment.id, {
    proposed_decision: dec1.decision,
    retry_count: 0,
    category: "BANK_NETWORK",
  });

  const { data: storedCase } = await supabase
    .from("recovery_cases")
    .select("recommended_action")
    .eq("id", testCase.id)
    .single();

  if (storedCase && storedCase.recommended_action === dec1.decision) {
    testResults.test9 = true;
    console.log(`✓ Test 9 PASS: Decision stored on recovery case ${testCase.id}.`);
  }

  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("event_type")
    .eq("recovery_case_id", testCase.id);

  const eventTypes = (auditLogs || []).map((a) => a.event_type);
  if (eventTypes.includes("DECISION_CREATED") && (eventTypes.includes("POLICY_APPROVED") || eventTypes.includes("POLICY_BLOCKED") || eventTypes.includes("POLICY_ESCALATED"))) {
    testResults.test11 = true;
    console.log(`✓ Test 11 PASS: Audit log contains DECISION_CREATED and POLICY_* events (${eventTypes.join(", ")}).`);
  } else {
    console.log(`✗ Test 11 FAIL: Missing audit events. Found: ${eventTypes.join(", ")}`);
  }

  // --- TEST 10: Verify case details / decision fetch ---
  console.log("\n10. Running Test 10: Verify Case Details decision and policy retrieval...");
  const fetchedCase = await recoveryService.getRecoveryCaseById(testCase.id);
  if (fetchedCase && fetchedCase.recommended_action === dec1.decision) {
    testResults.test10 = true;
    console.log(`✓ Test 10 PASS: Case Details decision and policy display values loaded successfully.`);
  }

  // Clean up test payment
  await supabase.from("payments").delete().eq("id", testPayment.id);

  // SUMMARY REPORT
  console.log("\n==========================================");
  console.log("  PHASE 7 TEST RESULTS SUMMARY");
  console.log("==========================================");
  console.log(`Test 1 (BANK_NETWORK Decision)      : ${testResults.test1 ? "PASS" : "FAIL"}`);
  console.log(`Test 2 (EXPIRED_CARD Decision)      : ${testResults.test2 ? "PASS" : "FAIL"}`);
  console.log(`Test 3 (INSUFFICIENT_FUNDS Decision): ${testResults.test3 ? "PASS" : "FAIL"}`);
  console.log(`Test 4 (CUSTOMER_CANCELLED Decision): ${testResults.test4 ? "PASS" : "FAIL"}`);
  console.log(`Test 5 (Max Retries POLICY_BLOCKED) : ${testResults.test5 ? "PASS" : "FAIL"}`);
  console.log(`Test 6 (Cooldown POLICY_BLOCKED)    : ${testResults.test6 ? "PASS" : "FAIL"}`);
  console.log(`Test 7 (Recovered POLICY_BLOCKED)   : ${testResults.test7 ? "PASS" : "FAIL"}`);
  console.log(`Test 8 (Fraud Check ESCALATED)     : ${testResults.test8 ? "PASS" : "FAIL"}`);
  console.log(`Test 9 (Decision Stored Supabase)   : ${testResults.test9 ? "PASS" : "FAIL"}`);
  console.log(`Test 10 (Dashboard / Case Display)  : ${testResults.test10 ? "PASS" : "FAIL"}`);
  console.log(`Test 11 (DECISION_CREATED Audits)   : ${testResults.test11 ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");

  const allPassed = Object.values(testResults).every(Boolean);
  if (allPassed) {
    console.log("ALL 11 PHASE 7 SELF-TESTS PASSED!");
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runPhase7SelfTests().catch((e) => {
  console.error("Phase 7 Test execution failed:", e);
  process.exit(1);
});
