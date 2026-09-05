import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { aiService } from "../src/services/ai.service";

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

async function runTests() {
  console.log("==========================================");
  console.log("  RECOVRA INTEGRATION TEST RUNNER");
  console.log("==========================================\n");

  const { recoveryService } = await import("../src/services/recovery.service");
  const { decisionService } = await import("../src/services/decision.service");
  const { policyService } = await import("../src/services/policy.service");
  const { negotiatorService } = await import("../src/services/negotiator.service");

  const results = {
    duplicatePreventionPassed: false,
    retrySchedulingPassed: false,
    aiAnalysisPassed: false,
    confidenceCalculationPassed: false,
    metricsPassed: false,
    auditLogsPassed: false,
    apiResponsesPassed: false,
    stageTransitionsPassed: false,
    decisionEnginePassed: false,
    policyEnginePassed: false,
    negotiatorPassed: false,
    timelinePassed: false,
    aiCount: 0,
    duplicatePreventedCount: 0,
    policyApprovalsCount: 0,
    policyBlocksCount: 0,
    merchantEscalationsCount: 0,
    totalConfidence: 0,
    caseCount: 0,
    simulationsRun: 0,
    simulationsPassed: 0,
  };

  // Find merchant ID
  const { data: merchants } = await supabase.from("merchants").select("id").limit(1);
  if (!merchants || merchants.length === 0) {
    console.error("Test error: please run scripts/seed-50.ts first.");
    process.exit(1);
  }
  const testMerchantId = merchants[0].id;

  // Insert failed payment
  const { data: testPayment, error: payErr } = await supabase
    .from("payments")
    .insert({
      merchant_id: testMerchantId,
      order_id: "order_TEST_CONV_99",
      amount: 499,
      status: "Failed",
      failure_reason: "BAD_REQUEST_PAYMENT_TIMED_OUT",
      payment_method: "Card",
    })
    .select()
    .single();

  if (payErr || !testPayment) {
    console.error("Failed to insert test payment:", payErr);
    process.exit(1);
  }

  // --- 1. Duplicate Recovery Prevention ---
  console.log("1. Testing Duplicate Recovery Prevention...");
  const case1 = await recoveryService.processPaymentFailure(testPayment.id);
  const case2 = await recoveryService.processPaymentFailure(testPayment.id);

  if (case1 && case2 && case1.id === case2.id) {
    results.duplicatePreventionPassed = true;
    results.duplicatePreventedCount++;
    console.log("✓ Duplicate prevention test passed: same case ID returned.");
  } else {
    console.log("✗ Duplicate prevention test failed!");
  }

  // --- 2. Retry Scheduling ---
  console.log("\n2. Testing Retry Scheduling...");
  if (case1 && case1.scheduled_retry_at) {
    const scheduledTime = new Date(case1.scheduled_retry_at).getTime();
    const nowTime = Date.now();
    const diffHours = (scheduledTime - nowTime) / (60 * 60 * 1000);
    if (diffHours > 1.8 && diffHours < 2.2) {
      results.retrySchedulingPassed = true;
      console.log(`✓ Retry scheduling test passed: scheduled retry time set in ~2 hours (${diffHours.toFixed(2)}h).`);
    } else {
      console.log(`✗ Retry scheduling test failed: retry duration was ${diffHours.toFixed(2)}h`);
    }
  } else {
    console.log("✗ Retry scheduling test failed: scheduled_retry_at was null");
  }

  // --- 3. AI Analysis Output JSON Format ---
  console.log("\n3. Testing AI Analysis Output JSON...");
  const aiOutput = await aiService.analyzePayment({
    payment_method: "upi",
    bank_code: null,
    error_code: "BAD_REQUEST_PAYMENT_DECLINED_BY_BANK",
    amount: 12000,
    retry_count: 0,
    timestamp: new Date().toISOString(),
  });

  results.aiCount++;
  const hasKeys =
    "root_cause" in aiOutput &&
    "explanation" in aiOutput &&
    "confidence_score" in aiOutput &&
    "severity" in aiOutput &&
    "recommended_action" in aiOutput &&
    "retry_recommended" in aiOutput &&
    "customer_message_summary" in aiOutput;

  const categories = [
    "Insufficient Funds",
    "Bank Timeout",
    "Network Failure",
    "Expired Card",
    "Blocked Card",
    "UPI Pending Timeout",
    "Incorrect UPI PIN",
    "Risk Decline",
    "Duplicate Payment",
    "Customer Cancelled",
    "Unknown Failure",
  ];

  if (hasKeys && categories.includes(aiOutput.root_cause)) {
    results.aiAnalysisPassed = true;
    console.log(`✓ AI Analysis output keys verified. Classification: "${aiOutput.root_cause}".`);
  } else {
    console.log("✗ AI Analysis output mismatch:", aiOutput);
  }

  // --- 4. Confidence Calculation engine ---
  console.log("\n4. Testing Confidence Calculation adjustments...");
  const baseAnalysis = await aiService.analyzePayment({
    payment_method: "card",
    bank_code: null,
    error_code: "BAD_REQUEST_PAYMENT_TIMED_OUT",
    amount: 499,
    retry_count: 0,
    timestamp: new Date().toISOString(),
  });

  const highRetryAnalysis = await aiService.analyzePayment({
    payment_method: "card",
    bank_code: null,
    error_code: "BAD_REQUEST_PAYMENT_TIMED_OUT",
    amount: 499,
    retry_count: 3,
    timestamp: new Date().toISOString(),
  });

  if (highRetryAnalysis.confidence_score < baseAnalysis.confidence_score) {
    results.confidenceCalculationPassed = true;
    console.log(
      `✓ Confidence test passed. 0 retries: ${baseAnalysis.confidence_score}%, 3 retries: ${highRetryAnalysis.confidence_score}% (Confidence correctly degraded).`
    );
  } else {
    console.log("✗ Confidence test failed to adjust for retries.");
  }

  // --- 5. Decision Engine Tests ---
  console.log("\n5. Testing Decision Engine Rules Matrix...");
  const devCaseMock = { id: case1.id, payment_id: testPayment.id };
  const mockBankTimeoutAnalysis = { root_cause: "Bank Timeout", confidence_score: 90 };
  const mockExpiredCardAnalysis = { root_cause: "Expired Card", confidence_score: 85 };
  const dec1 = await decisionService.generateDecision({ category: "BANK_NETWORK", confidence: 0.90 });
  const dec2 = await decisionService.generateDecision({ category: "EXPIRED_CARD", confidence: 0.99 });
  const dec3 = await decisionService.generateDecision({ category: "INSUFFICIENT_FUNDS", confidence: 0.20 });

  if (
    dec1.decision === "WAIT_AND_RETRY" &&
    dec2.decision === "REQUEST_NEW_PAYMENT_METHOD" &&
    dec3.decision === "ESCALATE_TO_MERCHANT"
  ) {
    results.decisionEnginePassed = true;
    console.log("✓ Decision matrix successfully mapped actions (WAIT_AND_RETRY, REQUEST_NEW_PAYMENT_METHOD) and escalated low-confidence cases.");
  } else {
    console.log("✗ Decision matrix mappings failed.");
  }

  // --- 6. Policy Engine Tests ---
  console.log("\n6. Testing Policy Engine Safety Blocks...");
  const recoveredCaseMock = { id: case1.id, payment_id: testPayment.id, recovery_status: "Recovered" };
  const activeDecisionMock = { recommended_action: "RETRY_PAYMENT", confidence_score: 95, scheduled_time: null };
  const resAlreadyRecovered = await policyService.checkPolicy(recoveredCaseMock, activeDecisionMock, []);
  if (!resAlreadyRecovered.allowed) {
    results.policyBlocksCount++;
  }

  const mockRetryHistoryExceeded = [
    { created_at: new Date().toISOString() },
    { created_at: new Date().toISOString() },
    { created_at: new Date().toISOString() },
    { created_at: new Date().toISOString() },
  ];
  const resRetryExceeded = await policyService.checkPolicy(case1, activeDecisionMock, mockRetryHistoryExceeded);
  if (!resRetryExceeded.allowed) {
    results.policyBlocksCount++;
  }

  const resApproved = await policyService.checkPolicy(case1, activeDecisionMock, []);
  if (resApproved.allowed) {
    results.policyApprovalsCount++;
  }

  if (results.policyBlocksCount >= 2 && results.policyApprovalsCount >= 1) {
    results.policyEnginePassed = true;
    console.log(`✓ Policy engine verified safety blocks (exceeded retries, already recovered) and allowed valid strategies.`);
  } else {
    console.log("✗ Policy engine validations failed.");
  }

  // --- 7. Timeline Event logs endpoint ---
  console.log("\n7. Testing Timeline History API endpoint...");
  const timelineData = await fetch(`http://localhost:3000/api/recovery/${case1.id}/timeline`, { cache: "no-store" }).then((r) => r.json());
  if (timelineData && timelineData.length > 0) {
    results.timelinePassed = true;
    const names = timelineData.map((e: any) => e.name);
    console.log(`✓ Timeline histories compiled successfully: ${names.join(" -> ")}`);
  } else {
    console.log("✗ Timeline endpoint failed.");
  }

  // --- 8. Dynamic Metrics API Endpoint ---
  console.log("\n8. Testing Advanced Metrics Calculations...");
  const metrics = await fetch("http://localhost:3000/api/recovery/metrics", { cache: "no-store" }).then((r) => r.json());
  if (
    metrics &&
    metrics.averageRetryCount !== undefined &&
    metrics.policyApprovalRate !== undefined &&
    metrics.blockedRecoveries !== undefined &&
    metrics.confidenceDistribution !== undefined
  ) {
    results.metricsPassed = true;
    console.log(`✓ Advanced metrics verified. Policy Approval Rate: ${metrics.policyApprovalRate}%, Blocked: ${metrics.blockedRecoveries}`);
  } else {
    console.log("✗ Advanced metrics endpoint failed:", metrics);
  }

  // --- 9. Phase 8.1 Conversational Negotiations Simulations (20 cases) ---
  console.log("\n9. Simulating 20 Conversations covering every Intent profile...");
  const conversationsToTest = [
    { text: "I want to settle this payment immediately", intent: "WILL_PAY_NOW" },
    { text: "Send me the checkout link to pay", intent: "NEEDS_PAYMENT_LINK" },
    { text: "I'll complete the charge tomorrow morning at 9am", intent: "WILL_PAY_LATER" },
    { text: "My visa card has expired, need to update details", intent: "CARD_EXPIRED" },
    { text: "My GPay app keeps crashing with PIN errors", intent: "UPI_ISSUE" },
    { text: "My bank account has insufficient balance right now", intent: "INSUFFICIENT_FUNDS" },
    { text: "Wait, I already saw a successful charge on my account", intent: "ALREADY_PAID" },
    { text: "Stop trying to recover, cancel my subscription", intent: "CANCEL_SERVICE" },
    { text: "I want to speak with a human support advisor right now", intent: "REQUEST_HUMAN" },
    { text: "What is this bill for? I don't remember this Acme charge", intent: "CONFUSED" },
    { text: "hi, who is this?", intent: "UNKNOWN" },

    // Variations to reach exactly 20 cases
    { text: "Let me pay this now", intent: "WILL_PAY_NOW" },
    { text: "Where is the URL checkout link?", intent: "NEEDS_PAYMENT_LINK" },
    { text: "I will check back next Monday to settle the balance", intent: "WILL_PAY_LATER" },
    { text: "My debit card expired", intent: "CARD_EXPIRED" },
    { text: "UPI session timed out", intent: "UPI_ISSUE" },
    { text: "I do not have enough funds today", intent: "INSUFFICIENT_FUNDS" },
    { text: "I paid already, check your system status", intent: "ALREADY_PAID" },
    { text: "Opt me out of these follow-ups, stop case recovery", intent: "CANCEL_SERVICE" },
    { text: "Transfer this request to a human operator", intent: "REQUEST_HUMAN" },
  ];

  results.simulationsRun = conversationsToTest.length;

  for (let i = 0; i < conversationsToTest.length; i++) {
    const sim = conversationsToTest[i];
    try {
      const response = await negotiatorService.processMessage({
        caseId: case1.id!,
        customerMessage: sim.text,
        conversationHistory: [],
        paymentContext: testPayment,
      });

      const keysMatch =
        "reply" in response &&
        "intent" in response &&
        "sentiment" in response &&
        "confidence" in response &&
        "recommended_action" in response &&
        "merchant_escalation" in response &&
        "schedule_retry" in response &&
        "retry_after_hours" in response;

      if (keysMatch && response.intent === sim.intent) {
        results.simulationsPassed++;
      } else {
        console.warn(`Sim ${i + 1} mismatch. Expected intent: ${sim.intent}, got: ${response.intent}`);
      }
    } catch (err: any) {
      console.error(`Sim ${i + 1} failed:`, err.message);
    }
  }

  if (results.simulationsPassed === results.simulationsRun) {
    results.negotiatorPassed = true;
    console.log(`✓ All 20 conversation simulations passed. Mapped intents & verified output JSON schemas successfully.`);
  } else {
    console.log(`✗ Negotiation simulations failed: ${results.simulationsPassed}/${results.simulationsRun} passed.`);
  }

  // --- 10. Audit Logs tracking ---
  console.log("\n10. Testing Audit Logs database entries...");
  const caseDetails = await recoveryService.getRecoveryCaseById(case1.id!);
  const audits = caseDetails.audits || [];
  const eventTypes = audits.map((a: any) => a.event_type);

  if (
    eventTypes.includes("Payment detected") &&
    eventTypes.includes("INTENT_DETECTED") &&
    eventTypes.includes("SENTIMENT_UPDATED") &&
    eventTypes.includes("NEGOTIATION_STARTED")
  ) {
    results.auditLogsPassed = true;
    console.log(`✓ Audit log verified: ${eventTypes.join(", ")} recorded in database.`);
  } else {
    console.log("✗ Audit logs missing required intent updates:", eventTypes);
  }

  // --- 11. API Fetch Responses ---
  console.log("\n11. Testing Dynamic API endpoints availability...");
  try {
    const [metricsRes, casesRes] = await Promise.all([
      fetch("http://localhost:3000/api/recovery/metrics", { cache: "no-store" }),
      fetch("http://localhost:3000/api/recovery", { cache: "no-store" }),
    ]);

    if (metricsRes.ok && casesRes.ok) {
      results.apiResponsesPassed = true;
      console.log("✓ Dynamic API Endpoints verified successfully (HTTP 200).");
    } else {
      console.log("✗ API Endpoints failed status check.");
    }
  } catch (err) {
    console.log("✗ API Endpoint fetches failed. Verify local dev server.");
  }

  // Clean up
  if (testPayment.id) {
    await supabase.from("payments").delete().eq("id", testPayment.id);
  }

  // --- FINAL VALIDATION SUMMARY REPORT ---
  console.log("\n==========================================");
  console.log("  RECOVRA VALIDATION SUMMARY REPORT");
  console.log("==========================================");

  const finalPayments = await supabase.from("payments").select("id", { count: "exact" });
  const finalFailed = await supabase.from("payments").select("id", { count: "exact" }).eq("status", "Failed");
  const finalCases = await supabase.from("recovery_cases").select("*, payments(*)", { count: "exact" });

  const totalPayments = finalPayments.count || 0;
  const failedPayments = finalFailed.count || 0;
  const recoveryCasesCount = finalCases.count || 0;

  // Calculate average confidence
  let confidenceSum = 0;
  let scoreCount = 0;
  (finalCases.data || []).forEach((c) => {
    if (c.confidence_score) {
      confidenceSum += Number(c.confidence_score);
      scoreCount++;
    }
  });
  const avgConfidence = scoreCount > 0 ? (confidenceSum / scoreCount).toFixed(1) : "0.0";
  const avgRetries = metrics.averageRetryCount || 0;

  console.log(`Total Payments Processed  : ${totalPayments}`);
  console.log(`Failed Payments Detected  : ${failedPayments}`);
  console.log(`Recovery Cases Created    : ${recoveryCasesCount}`);
  console.log(`Duplicate Cases Prevented : ${results.duplicatePreventedCount}`);
  console.log(`AI Analysis Success Count : ${results.aiCount}`);
  console.log(`Policy Approvals Count    : ${metrics.policyApprovalRate ? Math.round((metrics.policyApprovalRate / 100) * (metrics.blockedRecoveries + metrics.merchantEscalations)) : 0}`);
  console.log(`Policy Blocks Count       : ${metrics.blockedRecoveries || 0}`);
  console.log(`Merchant Escalations Count: ${metrics.merchantEscalations || 0}`);
  console.log(`Average AI Confidence (%) : ${avgConfidence}%`);
  console.log(`Average Case Retries      : ${avgRetries}`);
  console.log("------------------------------------------");
  console.log("Test Checklist Status:");
  console.log(`- Duplicate Prevention    : ${results.duplicatePreventionPassed ? "PASS" : "FAIL"}`);
  console.log(`- Retry Scheduling        : ${results.retrySchedulingPassed ? "PASS" : "FAIL"}`);
  console.log(`- AI Analysis Format      : ${results.aiAnalysisPassed ? "PASS" : "FAIL"}`);
  console.log(`- Confidence Degradation   : ${results.confidenceCalculationPassed ? "PASS" : "FAIL"}`);
  console.log(`- Decision Matrix mappings: ${results.decisionEnginePassed ? "PASS" : "FAIL"}`);
  console.log(`- Policy Safety Blocks    : ${results.policyEnginePassed ? "PASS" : "FAIL"}`);
  console.log(`- AI Negotiator Intent    : ${results.negotiatorPassed ? "PASS" : "FAIL"}`);
  console.log(`- Timeline Event API      : ${results.timelinePassed ? "PASS" : "FAIL"}`);
  console.log(`- Advanced Metrics API    : ${results.metricsPassed ? "PASS" : "FAIL"}`);
  console.log(`- Audit Logs Tracking     : ${results.auditLogsPassed ? "PASS" : "FAIL"}`);
  console.log(`- API Route Fetches       : ${results.apiResponsesPassed ? "PASS" : "FAIL"}`);
  console.log("==========================================\n");

  const overallPass =
    results.duplicatePreventionPassed &&
    results.retrySchedulingPassed &&
    results.aiAnalysisPassed &&
    results.confidenceCalculationPassed &&
    results.decisionEnginePassed &&
    results.policyEnginePassed &&
    results.negotiatorPassed &&
    results.timelinePassed &&
    results.metricsPassed &&
    results.auditLogsPassed &&
    results.apiResponsesPassed;

  if (overallPass) {
    console.log("ALL TESTS COMPLETED SUCCESSFULLY! Recovra core engine ready.");
  } else {
    console.error("SOME TESTS FAILED. Verify integrations.");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
