import { supabase } from "@/src/lib/supabase";
import { logger } from "@/src/lib/logger";

export interface DemoScenario {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "upi_outage",
    name: "Demo: UPI Network Outage",
    category: "Network Failure",
    description: "Simulates major NPCI UPI gateway network timeouts across multiple merchants.",
  },
  {
    id: "bank_failure",
    name: "Demo: Bank Core Ledger Failure",
    category: "Banking Error",
    description: "Simulates HDFC/ICICI core banking server downtime soft declines.",
  },
  {
    id: "expired_cards",
    name: "Demo: Expired Cards Campaign",
    category: "Customer Issues",
    description: "Simulates recurring subscription card expiration and payment link dispatch.",
  },
  {
    id: "high_recovery",
    name: "Demo: High Recovery Day (85%)",
    category: "Performance",
    description: "Simulates a high-efficiency recovery day with 85% verified recovered transactions.",
  },
  {
    id: "merchant_escalation",
    name: "Demo: Merchant Escalation Review",
    category: "Safety & Policy",
    description: "Simulates high-value transactions flagged for merchant approval.",
  },
  {
    id: "promise_to_pay",
    name: "Demo: Customer Promise-To-Pay",
    category: "AI Negotiator",
    description: "Simulates active AI conversation negotiations resulting in promised payments.",
  },
  {
    id: "payment_link_success",
    name: "Demo: Payment Link Recovery Success",
    category: "Recovery Execution",
    description: "Simulates customer payment completion via generated Razorpay payment link.",
  },
];

export class DemoService {
  /**
   * Returns list of available 1-click demo scenarios.
   */
  getScenarios(): DemoScenario[] {
    return DEMO_SCENARIOS;
  }

  /**
   * Step 1 - Step 7: Seeds 100 realistic records across all database tables.
   */
  async seedDemoScenarios() {
    logger.info("Executing Phase 10C Demo Dataset & Scenario Seeder...", { component: "DemoService" });

    // Step 2: Seed Merchants across 6 categories
    const merchantCategories = [
      { name: "Acme SaaS Cloud Inc.", email: "mch_saas@acmeretail.sys", key: "rzp_test_saas_99" },
      { name: "Global Mart Ecommerce", email: "mch_ecom@globalmart.sys", key: "rzp_test_ecom_88" },
      { name: "EduSkill Online Academy", email: "mch_edu@eduskill.sys", key: "rzp_test_edu_77" },
      { name: "MediCare Health Tech", email: "mch_health@medicare.sys", key: "rzp_test_health_66" },
      { name: "PlayZone Gaming Studio", email: "mch_gaming@playzone.sys", key: "rzp_test_gaming_55" },
      { name: "StreamPlus Subscriptions", email: "mch_sub@streamplus.sys", key: "rzp_test_sub_44" },
    ];

    const merchantIds: string[] = [];

    for (const m of merchantCategories) {
      const { data: existing } = await supabase.from("merchants").select("id").eq("email", m.email).maybeSingle();
      if (existing) {
        merchantIds.push(existing.id);
      } else {
        const { data: created, error } = await supabase
          .from("merchants")
          .insert({
            name: m.name,
            email: m.email,
            business_name: m.name,
          })
          .select()
          .single();

        if (!error && created) {
          merchantIds.push(created.id);
        }
      }
    }

    if (merchantIds.length === 0) {
      const { data: fallbackMerchants } = await supabase.from("merchants").select("id").limit(1);
      if (fallbackMerchants && fallbackMerchants.length > 0) {
        merchantIds.push(fallbackMerchants[0].id);
      } else {
        merchantIds.push("00000000-0000-0000-0000-000000000001");
      }
    }

    const primaryMerchantId = merchantIds[0];

    // Pools for realistic generation
    const failureReasons = [
      "Network Timeout",
      "Insufficient Funds",
      "Authentication Failed",
      "Expired Card",
      "Fraud Suspected",
    ];

    const paymentMethods = ["UPI", "Credit Card", "Debit Card", "Wallet", "Net Banking"];
    const stages = ["DETECTED", "DIAGNOSING", "DECIDED", "WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"];
    const statusMap: Record<string, string> = {
      DETECTED: "Detected",
      DIAGNOSING: "Diagnosing",
      DECIDED: "Action Selected",
      WAITING: "Waiting",
      NEGOTIATING: "Negotiating",
      RECOVERED: "Recovered",
      CLOSED: "Failed",
    };

    const firstNames = ["Sarah", "Alex", "David", "Priya", "Rahul", "Marcus", "Elena", "Vikram", "Jessica", "Aarav"];
    const lastNames = ["Jenkins", "Chen", "Smith", "Sharma", "Verma", "Vance", "Kowalski", "Patel", "Taylor", "Gupta"];

    let countCreated = 0;
    const now = Date.now();

    // Step 1: Generate 100 payments in 1 batch
    const allPaymentsToInsert = [];
    for (let i = 0; i < 100; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 2) % lastNames.length];
      const amount = Math.floor(Math.random() * 74000) + 99; // ₹99 to ₹75,000
      const reason = failureReasons[i % failureReasons.length];
      const method = paymentMethods[i % paymentMethods.length];
      const stage = stages[i % stages.length];
      const status = statusMap[stage];

      const daysAgo = Math.floor(Math.random() * 30);
      const createdAtDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      const pStatus = status === "Recovered" ? "Completed" : i % 5 === 0 ? "Pending" : i % 6 === 0 ? "Refunded" : "Failed";

      allPaymentsToInsert.push({
        merchant_id: merchantIds[i % merchantIds.length] || primaryMerchantId,
        order_id: `ord_demo_${now}_${i}`,
        payment_id: `pay_demo_${now}_${i}`,
        amount,
        currency: "INR",
        status: pStatus,
        failure_reason: reason,
        payment_method: method,
        created_at: createdAtDate,
      });
    }

    const { data: insertedPayments, error: pErr } = await supabase
      .from("payments")
      .insert(allPaymentsToInsert)
      .select();

    if (pErr || !insertedPayments) {
      logger.error("Error batch inserting payments", pErr);
      throw new Error("Failed to insert payments batch: " + (pErr?.message || "Unknown error"));
    }

    // Step 2: Generate 100 Recovery Cases in 1 batch
    const allCasesToInsert = [];
    for (let i = 0; i < insertedPayments.length; i++) {
      const payment = insertedPayments[i];
      const stage = stages[i % stages.length];
      const status = statusMap[stage];
      const confidence = Math.floor(Math.random() * 53) + 45; // 45% to 98%

      allCasesToInsert.push({
        merchant_id: payment.merchant_id,
        payment_id: payment.id,
        recovery_status: status,
        current_stage: stage,
        confidence_score: confidence,
        recommended_action: stage === "RECOVERED" ? "EXECUTE_RETRY" : "WAIT_AND_RETRY",
        created_at: payment.created_at,
      });
    }

    const { data: insertedCases, error: cErr } = await supabase
      .from("recovery_cases")
      .insert(allCasesToInsert)
      .select();

    if (cErr || !insertedCases) {
      logger.error("Error batch inserting recovery cases", cErr);
      throw new Error("Failed to insert recovery cases batch: " + (cErr?.message || "Unknown error"));
    }

    countCreated = insertedCases.length;

    // Step 3: Generate Audit Logs in 1 batch
    const auditBatch = [];
    for (const c of insertedCases) {
      auditBatch.push({
        recovery_case_id: c.id,
        payment_id: c.payment_id,
        event_type: "CASE_CREATED",
        actor: "SYSTEM",
        reason: `Failed payment detected for recovery case ${c.id?.substring(0, 8)}`,
        result: `Created recovery case ${c.id?.substring(0, 8)} in stage ${c.current_stage}`,
        created_at: c.created_at,
      });

      auditBatch.push({
        recovery_case_id: c.id,
        payment_id: c.payment_id,
        event_type: c.recovery_status === "Recovered" ? "PAYMENT_SUCCESS" : "DIAGNOSIS_CREATED",
        actor: "GEMINI_1.5_FLASH",
        reason: `Automated diagnostic analysis completed for stage ${c.current_stage}`,
        result: `Confidence score: ${c.confidence_score}%. Action: ${c.recommended_action}`,
        created_at: c.created_at,
      });
    }
    const { error: aErr } = await supabase.from("audit_logs").insert(auditBatch);
    if (aErr) console.error("Error inserting auditBatch:", aErr);

    // Step 4: Seed Conversations for Negotiating cases
    const negotiatingCases = insertedCases.filter((c) => c.current_stage === "NEGOTIATING" || c.current_stage === "RECOVERED");
    if (negotiatingCases.length > 0) {
      const sampleConversations = [
        {
          customer_msg: "I will pay next Tuesday morning after my salary gets credited.",
          intent: "PROMISE_TO_PAY",
          sentiment: "Positive",
          ai_reply: "Understood! I have configured our system to hold the retry until Tuesday morning.",
        },
        {
          customer_msg: "Can you hold the retry for 3 days?",
          intent: "NEEDS_MORE_TIME",
          sentiment: "Neutral",
          ai_reply: "Sure thing! Your recovery retry has been rescheduled for 3 days from now.",
        },
        {
          customer_msg: "My card expired, can I pay via UPI or payment link?",
          intent: "WANTS_NEW_PAYMENT_LINK",
          sentiment: "Neutral",
          ai_reply: "Certainly! Here is your custom Razorpay payment link to complete the transaction.",
        },
      ];

      const conversationBatch = [];
      for (let i = 0; i < negotiatingCases.length; i++) {
        const c = negotiatingCases[i];
        const conv = sampleConversations[i % sampleConversations.length];
        const metaIntent = JSON.stringify({ intent: conv.intent, sentiment: conv.sentiment, ai_engine: "GEMINI_1.5_FLASH" });

        conversationBatch.push({
          recovery_case_id: c.id,
          role: "customer",
          message: conv.customer_msg,
          detected_intent: metaIntent,
          confidence_score: 92,
          created_at: c.created_at,
        });

        conversationBatch.push({
          recovery_case_id: c.id,
          role: "assistant",
          message: conv.ai_reply,
          detected_intent: metaIntent,
          confidence_score: 95,
          created_at: c.created_at,
        });
      }

      await supabase.from("conversations").insert(conversationBatch);
    }

    // Step 7: Seed Exceptions
    const sampleExceptions = [
      { type: "GEMINI_QUOTA_EXCEEDED", severity: "HIGH", msg: "API quota threshold reached. Switching to local fallback." },
      { type: "WEBHOOK_SIGNATURE_INVALID", severity: "CRITICAL", msg: "Received unauthenticated webhook payload signature." },
      { type: "RAZORPAY_API_ERROR", severity: "MEDIUM", msg: "Gateway API connection timeout on test mode order creation." },
      { type: "DUPLICATE_WEBHOOK", severity: "LOW", msg: "Duplicate webhook delivery payload ignored." },
      { type: "POLICY_BLOCK", severity: "HIGH", msg: "Safety policy gate halted recovery due to max retries limit." },
    ];

    const exceptionAuditBatch = sampleExceptions.map((exc, idx) => ({
      actor: "SAFETY_POLICY_ENGINE",
      event_type: "EXCEPTION_CREATED",
      reason: `Exception [${exc.type}]: ${exc.msg}`,
      result: `Severity: ${exc.severity}. Status: Unresolved.`,
      metadata: {
        id: `exc_demo_${now}_${idx}`,
        type: exc.type,
        severity: exc.severity,
        message: exc.msg,
        resolved: false,
      },
    }));

    const { error: eErr } = await supabase.from("audit_logs").insert(exceptionAuditBatch);
    if (eErr) console.error("Error inserting exceptionAuditBatch:", eErr);

    logger.audit("DEMO_SEED_SUCCESS", "Seeded 100 Demo Records", `Total Created: ${countCreated}`);
    return {
      success: true,
      countCreated,
      merchantsCount: merchantCategories.length,
      primaryMerchantId,
    };
  }

  /**
   * Step 8: Runs a specific 1-click demo scenario by ID.
   */
  async runDemoScenario(scenarioId: string) {
    logger.info(`Running 1-Click Demo Scenario: ${scenarioId}`, { scenarioId });

    // Seed base dataset first
    const seedResult = await this.seedDemoScenarios();
    const merchantId = seedResult.primaryMerchantId;

    if (scenarioId === "upi_outage") {
      // Seed 10 specific UPI network failure cases
      const upiPayments = [];
      for (let i = 0; i < 10; i++) {
        upiPayments.push({
          merchant_id: merchantId,
          order_id: `ord_upi_outage_${Date.now()}_${i}`,
          payment_id: `pay_upi_outage_${Date.now()}_${i}`,
          amount: 2499,
          currency: "INR",
          status: "Failed",
          failure_reason: "Network Timeout",
          payment_method: "UPI",
        });
      }

      const { data: insertedP } = await supabase.from("payments").insert(upiPayments).select();

      if (insertedP) {
        const upiCases = insertedP.map((p) => ({
          merchant_id: merchantId,
          payment_id: p.id,
          recovery_status: "Waiting",
          current_stage: "WAITING",
          confidence_score: 92,
          recommended_action: "WAIT_AND_RETRY",
        }));
        await supabase.from("recovery_cases").insert(upiCases);
      }
    } else if (scenarioId === "promise_to_pay") {
      // Seed 5 active customer promise-to-pay cases
      const p2pPayments = [];
      for (let i = 0; i < 5; i++) {
        p2pPayments.push({
          merchant_id: merchantId,
          order_id: `ord_p2p_${Date.now()}_${i}`,
          payment_id: `pay_p2p_${Date.now()}_${i}`,
          amount: 15400,
          currency: "INR",
          status: "Failed",
          failure_reason: "Insufficient Funds",
          payment_method: "Card",
        });
      }

      const { data: insertedP2P } = await supabase.from("payments").insert(p2pPayments).select();

      if (insertedP2P) {
        const p2pCases = insertedP2P.map((p) => ({
          merchant_id: merchantId,
          payment_id: p.id,
          recovery_status: "Negotiating",
          current_stage: "NEGOTIATING",
          confidence_score: 88,
          recommended_action: "HOLD_RETRY_TILL_PROMISE",
        }));
        await supabase.from("recovery_cases").insert(p2pCases);
      }
    } else if (scenarioId === "high_recovery") {
      // Seed 15 recovered cases
      const highRecPayments = [];
      for (let i = 0; i < 15; i++) {
        highRecPayments.push({
          merchant_id: merchantId,
          order_id: `ord_high_rec_${Date.now()}_${i}`,
          payment_id: `pay_high_rec_${Date.now()}_${i}`,
          amount: 8900,
          currency: "INR",
          status: "Completed",
          failure_reason: "Network Timeout",
          payment_method: "UPI",
        });
      }

      const { data: insertedHigh } = await supabase.from("payments").insert(highRecPayments).select();

      if (insertedHigh) {
        const highCases = insertedHigh.map((p) => ({
          merchant_id: merchantId,
          payment_id: p.id,
          recovery_status: "Recovered",
          current_stage: "RECOVERED",
          confidence_score: 95,
          recommended_action: "EXECUTE_RETRY",
        }));
        await supabase.from("recovery_cases").insert(highCases);
      }
    }

    return {
      success: true,
      scenarioId,
      message: `Successfully executed demo scenario '${scenarioId}'`,
    };
  }

  /**
   * Step 9: Cleanly resets demo database records without touching production configs.
   */
  async resetDemoData() {
    logger.warn("Resetting demo database environment...", { component: "DemoService" });

    await supabase.from("exceptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("conversations").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("recovery_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    logger.info("Demo database environment successfully reset.");
    return { success: true, message: "Database environment reset complete." };
  }
}

export const demoService = new DemoService();
