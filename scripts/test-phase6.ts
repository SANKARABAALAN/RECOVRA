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

async function runPhase6SelfTests() {
  console.log("==========================================");
  console.log("  RECOVRA PHASE 6 MANDATORY SELF-TESTS");
  console.log("==========================================\n");

  const { aiService } = await import("../src/services/ai.service");
  const { recoveryService } = await import("../src/services/recovery.service");

  const testResults = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
    test6: false,
    test7: false,
    test8: false,
  };

  // Get merchant ID
  const { data: merchants } = await supabase.from("merchants").select("id").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("Please seed merchant records first.");
    process.exit(1);
  }
  const testMerchantId = merchants[0].id;

  // --- TEST 1: Analyze a BANK_NETWORK failure ---
  console.log("1. Running Test 1: Analyze BANK_NETWORK failure...");
  const diag1 = await aiService.diagnosePayment({
    payment_method: "Card",
    error_code: "GATEWAY_TIMEOUT",
    amount: 1999,
  });

  if (diag1.category === "BANK_NETWORK") {
    testResults.test1 = true;
    console.log(`✓ Test 1 PASS: Category is 'BANK_NETWORK' (Root Cause: '${diag1.root_cause}').`);
  } else {
    console.log(`✗ Test 1 FAIL: Got category '${diag1.category}'`);
  }

  // --- TEST 2: Analyze an EXPIRED_CARD failure ---
  console.log("\n2. Running Test 2: Analyze EXPIRED_CARD failure...");
  const diag2 = await aiService.diagnosePayment({
    payment_method: "Card",
    error_code: "CARD_EXPIRED",
    amount: 2999,
  });

  if (diag2.category === "EXPIRED_CARD") {
    testResults.test2 = true;
    console.log(`✓ Test 2 PASS: Category is 'EXPIRED_CARD' (Root Cause: '${diag2.root_cause}').`);
  } else {
    console.log(`✗ Test 2 FAIL: Got category '${diag2.category}'`);
  }

  // --- TEST 3: Analyze an INSUFFICIENT_FUNDS failure ---
  console.log("\n3. Running Test 3: Analyze INSUFFICIENT_FUNDS failure...");
  const diag3 = await aiService.diagnosePayment({
    payment_method: "Netbanking",
    error_code: "INSUFFICIENT_BALANCE",
    amount: 5000,
  });

  if (diag3.category === "INSUFFICIENT_FUNDS") {
    testResults.test3 = true;
    console.log(`✓ Test 3 PASS: Category is 'INSUFFICIENT_FUNDS' (Root Cause: '${diag3.root_cause}').`);
  } else {
    console.log(`✗ Test 3 FAIL: Got category '${diag3.category}'`);
  }

  // --- TEST 4: Gemini unavailable -> LOCAL_FALLBACK used automatically ---
  console.log("\n4. Running Test 4: Verify Gemini failure fallback to LOCAL_FALLBACK...");
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "INVALID_TEST_KEY_FOR_FALLBACK";

  const fallbackDiag = await aiService.diagnosePayment({
    payment_method: "UPI",
    error_code: "INCORRECT_PIN",
    amount: 499,
  });

  process.env.GEMINI_API_KEY = savedKey; // restore key

  if (fallbackDiag.ai_engine === "LOCAL_FALLBACK" && fallbackDiag.category === "UPI_PIN_ERROR") {
    testResults.test4 = true;
    console.log(`✓ Test 4 PASS: Automatically invoked 'LOCAL_FALLBACK' when Gemini was unavailable.`);
  } else {
    console.log(`✗ Test 4 FAIL: Got engine '${fallbackDiag.ai_engine}'`);
  }

  // --- TEST 5: Verify confidence is always between 0 and 1 ---
  console.log("\n5. Running Test 5: Verify confidence score is clamped between 0.00 and 1.00...");
  const allConfs = [diag1.confidence, diag2.confidence, diag3.confidence, fallbackDiag.confidence];
  const allClamped = allConfs.every((c) => typeof c === "number" && c >= 0.0 && c <= 1.0);

  if (allClamped) {
    testResults.test5 = true;
    console.log(`✓ Test 5 PASS: All confidence scores are float numbers between 0.00 and 1.00 (${allConfs.join(", ")}).`);
  } else {
    console.log(`✗ Test 5 FAIL: Confidence scores out of range: ${allConfs.join(", ")}`);
  }

  // --- TEST 6 & 8: Store Diagnosis in Supabase & Audit log DIAGNOSIS_CREATED ---
  console.log("\n6. Running Test 6 & 8: Store Diagnosis in Supabase & check DIAGNOSIS_CREATED audit log...");
  const { data: testPayment } = await supabase
    .from("payments")
    .insert({
      merchant_id: testMerchantId,
      order_id: `order_P6_TEST_${Date.now()}`,
      amount: 3499,
      currency: "INR",
      status: "Failed",
      failure_reason: "GATEWAY_TIMEOUT",
    })
    .select()
    .single();

  const testCase = await recoveryService.processPaymentFailure(testPayment.id);
  const storedResult = await aiService.storeDiagnosis(testCase.id, diag1);

  if (storedResult.case && (storedResult.case.customer_intent === diag1.root_cause || storedResult.case.failure_reason === diag1.root_cause)) {
    testResults.test6 = true;
    console.log(`✓ Test 6 PASS: Diagnosis stored in Supabase recovery case ${testCase.id}.`);
  } else {
    console.log(`✗ Test 6 FAIL: Stored customer_intent '${storedResult.case?.customer_intent}' did not match '${diag1.root_cause}'`);
  }

  // Check audit log
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("recovery_case_id", testCase.id)
    .eq("event_type", "DIAGNOSIS_CREATED");

  if (auditLogs && auditLogs.length > 0) {
    testResults.test8 = true;
    console.log(`✓ Test 8 PASS: Audit event 'DIAGNOSIS_CREATED' recorded in Supabase audit_logs table.`);
  } else {
    console.log("✗ Test 8 FAIL: 'DIAGNOSIS_CREATED' audit log missing.");
  }

  // --- TEST 7: Verify Case Details / Diagnosis endpoint loads diagnosis ---
  console.log("\n7. Running Test 7: Verify stored diagnosis retrieval...");
  const fetchedCase = await recoveryService.getRecoveryCaseById(testCase.id);
  if (fetchedCase && fetchedCase.failure_reason === diag1.root_cause) {
    testResults.test7 = true;
    console.log(`✓ Test 7 PASS: Diagnosis details retrieved cleanly.`);
  } else {
    console.log("✗ Test 7 FAIL: Case retrieval did not contain diagnosis.");
  }

  // Cleanup test payment
  await supabase.from("payments").delete().eq("id", testPayment.id);

  // SUMMARY REPORT
  console.log("\n==========================================");
  console.log("  PHASE 6 TEST RESULTS SUMMARY");
  console.log("==========================================");
  console.log(`Test 1 (BANK_NETWORK Category)       : ${testResults.test1 ? "PASS" : "FAIL"}`);
  console.log(`Test 2 (EXPIRED_CARD Category)       : ${testResults.test2 ? "PASS" : "FAIL"}`);
  console.log(`Test 3 (INSUFFICIENT_FUNDS Category) : ${testResults.test3 ? "PASS" : "FAIL"}`);
  console.log(`Test 4 (Gemini Fallback Engine)      : ${testResults.test4 ? "PASS" : "FAIL"}`);
  console.log(`Test 5 (Confidence 0.00-1.00 Float)  : ${testResults.test5 ? "PASS" : "FAIL"}`);
  console.log(`Test 6 (Diagnosis Supabase Store)    : ${testResults.test6 ? "PASS" : "FAIL"}`);
  console.log(`Test 7 (Case Details Page Display)   : ${testResults.test7 ? "PASS" : "FAIL"}`);
  console.log(`Test 8 (DIAGNOSIS_CREATED Audit Log) : ${testResults.test8 ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");

  const allPassed = Object.values(testResults).every(Boolean);
  if (allPassed) {
    console.log("ALL 8 PHASE 6 SELF-TESTS PASSED!");
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runPhase6SelfTests().catch((e) => {
  console.error("Phase 6 Test execution failed:", e);
  process.exit(1);
});
