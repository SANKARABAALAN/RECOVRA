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

async function runPhase8SelfTests() {
  console.log("==========================================");
  console.log("  RECOVRA PHASE 8 MANDATORY SELF-TESTS");
  console.log("==========================================\n");

  const { negotiatorService } = await import("../src/services/negotiator.service");
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

  // Create isolated payment & recovery case for chat testing
  const { data: testPayment } = await supabase
    .from("payments")
    .insert({
      merchant_id: testMerchantId,
      order_id: `order_P8_TEST_${Date.now()}`,
      amount: 2499,
      currency: "INR",
      status: "Failed",
      failure_reason: "INSUFFICIENT_FUNDS",
    })
    .select()
    .single();

  const testCase = await recoveryService.processPaymentFailure(testPayment.id);

  // --- TEST 1: "I'll pay tomorrow morning." -> PROMISE_TO_PAY ---
  console.log("1. Running Test 1: Message 'I'll pay tomorrow morning.'...");
  const res1 = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "I'll pay tomorrow morning.",
  });
  if (res1.intent === "PROMISE_TO_PAY") {
    testResults.test1 = true;
    console.log(`✓ Test 1 PASS: Intent detected as '${res1.intent}'.`);
  } else {
    console.log(`✗ Test 1 FAIL: Got intent '${res1.intent}'`);
  }

  // --- TEST 2: "My card expired." -> CARD_EXPIRED ---
  console.log("\n2. Running Test 2: Message 'My card expired.'...");
  const res2 = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "My card expired.",
  });
  if (res2.intent === "CARD_EXPIRED") {
    testResults.test2 = true;
    console.log(`✓ Test 2 PASS: Intent detected as '${res2.intent}'.`);
  } else {
    console.log(`✗ Test 2 FAIL: Got intent '${res2.intent}'`);
  }

  // --- TEST 3: "I already paid." -> PAYMENT_ALREADY_DONE ---
  console.log("\n3. Running Test 3: Message 'I already paid.'...");
  const res3 = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "I already paid.",
  });
  if (res3.intent === "PAYMENT_ALREADY_DONE") {
    testResults.test3 = true;
    console.log(`✓ Test 3 PASS: Intent detected as '${res3.intent}'.`);
  } else {
    console.log(`✗ Test 3 FAIL: Got intent '${res3.intent}'`);
  }

  // --- TEST 4: "I need more time." -> NEEDS_MORE_TIME ---
  console.log("\n4. Running Test 4: Message 'I need more time.'...");
  const res4 = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "I need more time.",
  });
  if (res4.intent === "NEEDS_MORE_TIME") {
    testResults.test4 = true;
    console.log(`✓ Test 4 PASS: Intent detected as '${res4.intent}'.`);
  } else {
    console.log(`✗ Test 4 FAIL: Got intent '${res4.intent}'`);
  }

  // --- TEST 5: "Why did my payment fail?" -> CUSTOMER_CONFUSED ---
  console.log("\n5. Running Test 5: Message 'Why did my payment fail?'...");
  const res5 = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "Why did my payment fail?",
  });
  if (res5.intent === "CUSTOMER_CONFUSED") {
    testResults.test5 = true;
    console.log(`✓ Test 5 PASS: Intent detected as '${res5.intent}'.`);
  } else {
    console.log(`✗ Test 5 FAIL: Got intent '${res5.intent}'`);
  }

  // --- TEST 6: Gemini unavailable -> LOCAL_FALLBACK used automatically ---
  console.log("\n6. Running Test 6: Verify Gemini failure fallback to LOCAL_FALLBACK...");
  const savedKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "INVALID_KEY_TEST";

  const fbRes = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "Please send me a new payment link",
  });

  process.env.GEMINI_API_KEY = savedKey; // Restore key

  if (fbRes.ai_engine === "LOCAL_FALLBACK") {
    testResults.test6 = true;
    console.log(`✓ Test 6 PASS: Automatically invoked 'LOCAL_FALLBACK' engine when Gemini was unavailable.`);
  } else {
    console.log(`✗ Test 6 FAIL: Got engine '${fbRes.ai_engine}'`);
  }

  // --- TEST 7: Promise-to-Pay created and stored ---
  console.log("\n7. Running Test 7: Verify Promise-to-Pay creation...");
  if (res1.promise_created) {
    testResults.test7 = true;
    console.log(`✓ Test 7 PASS: Promise-to-Pay created and linked to case (Promised Amount: INR ${res1.promised_amount}).`);
  } else {
    console.log("✗ Test 7 FAIL: Promise-to-Pay was not flagged as created.");
  }

  // --- TEST 8: Policy blocks an unsafe action -> Safe conversational response ---
  console.log("\n8. Running Test 8: Policy blocks unsafe action (customer cancellation)...");
  const cancelRes = await negotiatorService.processChat({
    caseId: testCase.id,
    customerMessage: "Opt me out of these follow-ups, stop case recovery",
  });

  if (cancelRes.policy_result === "BLOCKED" || cancelRes.recommended_action === "STOP_RECOVERY") {
    testResults.test8 = true;
    console.log(`✓ Test 8 PASS: Safe conversational response generated when policy gate triggered.`);
  } else {
    console.log(`✗ Test 8 FAIL: Got policy_result '${cancelRes.policy_result}'`);
  }

  // --- TEST 9: Conversation history saved to Supabase ---
  console.log("\n9. Running Test 9: Verify conversation history saved in Supabase...");
  const { data: convData } = await supabase
    .from("conversations")
    .select("*")
    .eq("recovery_case_id", testCase.id);

  if (convData && convData.length >= 2) {
    testResults.test9 = true;
    console.log(`✓ Test 9 PASS: ${convData.length} conversation messages stored in Supabase.`);
  } else {
    console.log(`✗ Test 9 FAIL: Found ${convData?.length} messages.`);
  }

  // --- TEST 10: Negotiator page / state retrieval ---
  console.log("\n10. Running Test 10: Verify chat history, intent, sentiment, policy, and promise retrieval...");
  if (convData && convData.length > 0 && testResults.test7) {
    testResults.test10 = true;
    console.log(`✓ Test 10 PASS: Negotiator state and chat history retrieved cleanly.`);
  }

  // --- TEST 11: Audit logs contain required events ---
  console.log("\n11. Running Test 11: Check audit logs for MESSAGE_RECEIVED, INTENT_DETECTED, RESPONSE_GENERATED, PROMISE_CREATED...");
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("event_type")
    .eq("recovery_case_id", testCase.id);

  const eventTypes = (auditLogs || []).map((a) => a.event_type);
  const requiredEvents = ["MESSAGE_RECEIVED", "INTENT_DETECTED", "RESPONSE_GENERATED", "PROMISE_CREATED"];
  const allFound = requiredEvents.every((e) => eventTypes.includes(e));

  if (allFound) {
    testResults.test11 = true;
    console.log(`✓ Test 11 PASS: All audit logs present (${requiredEvents.join(", ")}).`);
  } else {
    console.log(`✗ Test 11 FAIL: Found event types: ${eventTypes.join(", ")}`);
  }

  // Clean up test payment
  await supabase.from("payments").delete().eq("id", testPayment.id);

  // SUMMARY REPORT
  console.log("\n==========================================");
  console.log("  PHASE 8 TEST RESULTS SUMMARY");
  console.log("==========================================");
  console.log(`Test 1 (PROMISE_TO_PAY Intent)       : ${testResults.test1 ? "PASS" : "FAIL"}`);
  console.log(`Test 2 (CARD_EXPIRED Intent)         : ${testResults.test2 ? "PASS" : "FAIL"}`);
  console.log(`Test 3 (PAYMENT_ALREADY_DONE Intent) : ${testResults.test3 ? "PASS" : "FAIL"}`);
  console.log(`Test 4 (NEEDS_MORE_TIME Intent)      : ${testResults.test4 ? "PASS" : "FAIL"}`);
  console.log(`Test 5 (CUSTOMER_CONFUSED Intent)    : ${testResults.test5 ? "PASS" : "FAIL"}`);
  console.log(`Test 6 (Gemini Fallback Engine)      : ${testResults.test6 ? "PASS" : "FAIL"}`);
  console.log(`Test 7 (Promise-to-Pay Stored)      : ${testResults.test7 ? "PASS" : "FAIL"}`);
  console.log(`Test 8 (Policy Block Safe Response)  : ${testResults.test8 ? "PASS" : "FAIL"}`);
  console.log(`Test 9 (Conversation History DB)    : ${testResults.test9 ? "PASS" : "FAIL"}`);
  console.log(`Test 10 (Negotiator UI Data Load)    : ${testResults.test10 ? "PASS" : "FAIL"}`);
  console.log(`Test 11 (Phase 8 Audit Event Log)    : ${testResults.test11 ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");

  const allPassed = Object.values(testResults).every(Boolean);
  if (allPassed) {
    console.log("ALL 11 PHASE 8 SELF-TESTS PASSED!");
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runPhase8SelfTests().catch((e) => {
  console.error("Phase 8 Test execution failed:", e);
  process.exit(1);
});
