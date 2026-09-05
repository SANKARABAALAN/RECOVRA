import { supabase } from "../lib/supabase";
import { geminiClient } from "../lib/gemini";
import { policyService } from "./policy.service";
import { auditService } from "./audit.service";

export type NegotiatorIntent =
  | "PROMISE_TO_PAY"
  | "NEEDS_MORE_TIME"
  | "CARD_EXPIRED"
  | "PAYMENT_ALREADY_DONE"
  | "PAYMENT_FAILED_AGAIN"
  | "WANTS_NEW_PAYMENT_LINK"
  | "CANNOT_PAY_NOW"
  | "DISPUTES_PAYMENT"
  | "CUSTOMER_CONFUSED"
  | "CUSTOMER_CANCELLED"
  | "UNKNOWN";

export type NegotiatorSentiment =
  | "POSITIVE"
  | "NEUTRAL"
  | "FRUSTRATED"
  | "ANGRY"
  | "CONFUSED"
  | "URGENT";

export interface NegotiatorInput {
  caseId: string;
  customerMessage: string;
  conversationHistory?: any[];
  paymentContext?: any;
}

export interface NegotiatorResponse {
  reply: string;
  intent: NegotiatorIntent;
  sentiment: NegotiatorSentiment;
  confidence: number;
  ai_engine: "GEMINI" | "LOCAL_FALLBACK";
  recommended_action: string;
  policy_result: "APPROVED" | "BLOCKED" | "ESCALATED";
  policy_reason: string;
  promise_created?: boolean;
  promised_time?: string | null;
  promised_amount?: number | null;
}

/**
 * Standardizes intent string to one of the 11 Phase 8 Intents
 */
export function normalizeIntent(rawIntent: string, message: string): NegotiatorIntent {
  const msg = message.toLowerCase();
  const raw = (rawIntent || "").toUpperCase();

  if (raw.includes("PROMISE") || raw.includes("WILL_PAY_LATER") || msg.includes("tomorrow") || msg.includes("next week") || msg.includes("pay by")) {
    return "PROMISE_TO_PAY";
  }
  if (raw.includes("NEEDS_MORE_TIME") || msg.includes("more time") || msg.includes("few days") || msg.includes("need time")) {
    return "NEEDS_MORE_TIME";
  }
  if (raw.includes("EXPIRED") || msg.includes("expired") || msg.includes("expiry")) {
    return "CARD_EXPIRED";
  }
  if (raw.includes("ALREADY_DONE") || raw.includes("ALREADY_PAID") || msg.includes("already paid") || msg.includes("paid already") || msg.includes("charged")) {
    return "PAYMENT_ALREADY_DONE";
  }
  if (raw.includes("FAILED_AGAIN") || msg.includes("failed again") || msg.includes("declined again")) {
    return "PAYMENT_FAILED_AGAIN";
  }
  if (raw.includes("NEW_PAYMENT_LINK") || raw.includes("NEEDS_PAYMENT_LINK") || msg.includes("payment link") || msg.includes("checkout link") || msg.includes("send link")) {
    return "WANTS_NEW_PAYMENT_LINK";
  }
  if (raw.includes("CANNOT_PAY") || msg.includes("cannot pay") || msg.includes("can't pay") || msg.includes("no money")) {
    return "CANNOT_PAY_NOW";
  }
  if (raw.includes("DISPUTE") || msg.includes("dispute") || msg.includes("wrong charge") || msg.includes("scam")) {
    return "DISPUTES_PAYMENT";
  }
  if (raw.includes("CONFUSED") || msg.includes("why did") || msg.includes("what is this") || msg.includes("explain")) {
    return "CUSTOMER_CONFUSED";
  }
  if (raw.includes("CANCEL") || msg.includes("opt me out") || msg.includes("stop") || msg.includes("cancel")) {
    return "CUSTOMER_CANCELLED";
  }

  return "UNKNOWN";
}

/**
 * Standardizes sentiment to one of the 6 Phase 8 Sentiments
 */
export function normalizeSentiment(rawSentiment: string, message: string): NegotiatorSentiment {
  const msg = message.toLowerCase();
  const raw = (rawSentiment || "").toUpperCase();

  if (raw.includes("FRUSTRAT") || msg.includes("frustrated") || msg.includes("annoyed")) {
    return "FRUSTRATED";
  }
  if (raw.includes("ANGRY") || msg.includes("angry") || msg.includes("mad") || msg.includes("terrible")) {
    return "ANGRY";
  }
  if (raw.includes("URGENT") || msg.includes("asap") || msg.includes("urgent") || msg.includes("immediately")) {
    return "URGENT";
  }
  if (raw.includes("CONFUSED") || msg.includes("confused") || msg.includes("why")) {
    return "CONFUSED";
  }
  if (raw.includes("POSITIV") || msg.includes("thank") || msg.includes("great") || msg.includes("sure")) {
    return "POSITIVE";
  }

  return "NEUTRAL";
}

export const negotiatorService = {
  /**
   * Main Phase 8 Chat Processing Pipeline:
   * 1. Audit MESSAGE_RECEIVED
   * 2. Intent & Sentiment Detection via Gemini or Local Fallback
   * 3. Audit INTENT_DETECTED & SENTIMENT_DETECTED
   * 4. Response Generation & Policy Validation Gate
   * 5. Audit RESPONSE_GENERATED & POLICY_CHECKED_IN_CHAT
   * 6. Promise-to-Pay Tracker if intent == PROMISE_TO_PAY
   * 7. Save conversation message history to Supabase
   */
  async processChat(input: NegotiatorInput): Promise<NegotiatorResponse> {
    if (!input.customerMessage || !input.customerMessage.trim()) {
      throw new Error("Customer message cannot be empty.");
    }

    // Fetch recovery case details
    const { data: caseDetails, error: caseErr } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", input.caseId)
      .maybeSingle();

    if (caseErr || !caseDetails) {
      throw new Error(`Recovery case not found: ${input.caseId}`);
    }

    const payment = caseDetails.payments || {};

    // 1. Audit Log: MESSAGE_RECEIVED
    await auditService.createAuditLog({
      recovery_case_id: input.caseId,
      payment_id: payment.id || null,
      actor: "CUSTOMER",
      event_type: "MESSAGE_RECEIVED",
      reason: `Customer message received: "${input.customerMessage}"`,
      result: "Logged",
      metadata: { message: input.customerMessage },
    });

    // Fetch existing conversation history
    const { data: convHistory } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", input.caseId)
      .order("created_at", { ascending: true });

    const historyArr = convHistory || input.conversationHistory || [];
    const historyText = historyArr
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.message}`)
      .join("\n");

    const prompt = `
You are the AI Recovery Negotiator for RECOVRA, managing an automated customer payment recovery conversation.

Payment Details:
- Amount: INR ${payment.amount || 0}
- Method: ${payment.payment_method || "Card"}
- Gateway Code: ${payment.failure_reason || "Declined"}

Conversation History:
${historyText}

Customer Message: "${input.customerMessage}"

Analyze and classify:
1. Intent (Exactly one):
   PROMISE_TO_PAY, NEEDS_MORE_TIME, CARD_EXPIRED, PAYMENT_ALREADY_DONE, PAYMENT_FAILED_AGAIN, WANTS_NEW_PAYMENT_LINK, CANNOT_PAY_NOW, DISPUTES_PAYMENT, CUSTOMER_CONFUSED, CUSTOMER_CANCELLED, UNKNOWN

2. Sentiment (Exactly one):
   POSITIVE, NEUTRAL, FRUSTRATED, ANGRY, CONFUSED, URGENT

3. Recommended Recovery Action:
   WAIT_AND_RETRY, SEND_PAYMENT_LINK, REQUEST_NEW_PAYMENT_METHOD, ESCALATE_TO_MERCHANT, STOP_RECOVERY

Generate a helpful, empathetic, and professional reply (2-3 sentences).

Return a JSON object conforming exactly to this schema:
{
  "reply": string,
  "intent": string,
  "sentiment": string,
  "confidence": number (between 0.00 and 1.00),
  "recommended_action": string
}
`;

    let aiEngine: "GEMINI" | "LOCAL_FALLBACK" = "GEMINI";
    let intent: NegotiatorIntent = "UNKNOWN";
    let sentiment: NegotiatorSentiment = "NEUTRAL";
    let confidence = 0.90;
    let reply = "";
    let recommendedAction = "WAIT_AND_RETRY";

    // 2. Attempt Gemini Processing
    try {
      const responseText = await geminiClient.generateContent(prompt, {
        responseMimeType: "application/json",
      });

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);

      intent = normalizeIntent(parsed.intent, input.customerMessage);
      sentiment = normalizeSentiment(parsed.sentiment, input.customerMessage);
      confidence = Number(parsed.confidence ?? 0.90);
      if (confidence > 1.0) confidence = Number((confidence / 100.0).toFixed(2));
      reply = parsed.reply;
      recommendedAction = parsed.recommended_action || "WAIT_AND_RETRY";
      aiEngine = "GEMINI";
    } catch (err: any) {
      console.warn("AI Negotiator: Gemini unavailable or errored. Using LOCAL_FALLBACK. Error:", err.message);
      const fb = this.localFallback(input.customerMessage);
      intent = fb.intent;
      sentiment = fb.sentiment;
      confidence = fb.confidence;
      reply = fb.reply;
      recommendedAction = fb.recommended_action;
      aiEngine = "LOCAL_FALLBACK";
    }

    // 3. Audit Logs: INTENT_DETECTED & SENTIMENT_DETECTED
    await auditService.createAuditLog({
      recovery_case_id: input.caseId,
      payment_id: payment.id || null,
      actor: aiEngine,
      event_type: "INTENT_DETECTED",
      reason: `Intent detected: ${intent}. Engine: ${aiEngine}.`,
      result: `Intent: ${intent}. Confidence: ${(confidence * 100).toFixed(0)}%`,
      metadata: { intent, confidence, ai_engine: aiEngine },
    });

    await auditService.createAuditLog({
      recovery_case_id: input.caseId,
      payment_id: payment.id || null,
      actor: aiEngine,
      event_type: "SENTIMENT_DETECTED",
      reason: `Sentiment detected: ${sentiment}.`,
      result: `Sentiment: ${sentiment}`,
      metadata: { sentiment },
    });

    // 4. Policy Engine Safety Validation Gate
    const retryAudits = historyArr.filter((a) => a.event_type === "RETRY_SCHEDULED" || a.event_type === "RETRY_EXECUTED");

    const policyEval = await policyService.evaluatePolicy(input.caseId, payment.id || null, {
      proposed_decision: recommendedAction as any,
      retry_count: retryAudits.length,
      customer_opt_out: intent === "CUSTOMER_CANCELLED",
      payment_status: payment.status,
      recovery_status: caseDetails.recovery_status,
      current_stage: caseDetails.current_stage,
    });

    // Audit Log: POLICY_CHECKED_IN_CHAT
    await auditService.createAuditLog({
      recovery_case_id: input.caseId,
      payment_id: payment.id || null,
      actor: "SAFETY_POLICY_ENGINE",
      event_type: "POLICY_CHECKED_IN_CHAT",
      reason: `Evaluated chat action '${recommendedAction}'. Policy Result: ${policyEval.policy_result}.`,
      result: policyEval.reason,
      metadata: { proposed_action: recommendedAction, policy_result: policyEval.policy_result, allowed: policyEval.allowed },
    });

    // If blocked by Policy Engine, construct safe conversational response
    if (!policyEval.allowed && policyEval.policy_result === "BLOCKED") {
      reply = `We understand. ${policyEval.reason} If you need any assistance, our support team is available.`;
      recommendedAction = "STOP_RECOVERY";
    }

    // Audit Log: RESPONSE_GENERATED
    await auditService.createAuditLog({
      recovery_case_id: input.caseId,
      payment_id: payment.id || null,
      actor: aiEngine,
      event_type: "RESPONSE_GENERATED",
      reason: `Generated response reply to customer.`,
      result: `Reply: "${reply}"`,
      metadata: { reply, recommended_action: recommendedAction },
    });

    // 5. Promise-to-Pay Tracker
    let promiseCreated = false;
    let promisedTime: string | null = null;
    let promisedAmount: number | null = null;

    if (intent === "PROMISE_TO_PAY") {
      promiseCreated = true;
      promisedAmount = Number(payment.amount || 0);
      promisedTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // +24h default promise

      await auditService.createAuditLog({
        recovery_case_id: input.caseId,
        payment_id: payment.id || null,
        actor: "PROMISE_TRACKER",
        event_type: "PROMISE_CREATED",
        reason: `Customer committed to pay. Promise-to-Pay active.`,
        result: `Promised Amount: INR ${promisedAmount}. Promised Date: ${promisedTime}`,
        metadata: { promised_amount: promisedAmount, promised_time: promisedTime, promise_status: "ACTIVE" },
      });
    }

    // 6. Save Conversation History Messages to Supabase
    const metaIntent = JSON.stringify({ intent, sentiment, ai_engine: aiEngine });
    await supabase.from("conversations").insert([
      {
        recovery_case_id: input.caseId,
        role: "customer",
        message: input.customerMessage,
        detected_intent: metaIntent,
        confidence_score: confidence * 100,
      },
      {
        recovery_case_id: input.caseId,
        role: "assistant",
        message: reply,
        detected_intent: metaIntent,
        confidence_score: confidence * 100,
      },
    ]);

    // Update case current stage if needed
    const nextStage = recommendedAction === "STOP_RECOVERY" ? "CLOSED" : "NEGOTIATING";
    const nextStatus = recommendedAction === "STOP_RECOVERY" ? "Closed" : "Negotiating";

    await supabase
      .from("recovery_cases")
      .update({
        current_stage: nextStage,
        recovery_status: nextStatus,
        recommended_action: recommendedAction,
      })
      .eq("id", input.caseId);

    return {
      reply,
      intent,
      sentiment,
      confidence,
      ai_engine: aiEngine,
      recommended_action: recommendedAction,
      policy_result: policyEval.policy_result,
      policy_reason: policyEval.reason,
      promise_created: promiseCreated,
      promised_time: promisedTime,
      promised_amount: promisedAmount,
    };
  },

  /**
   * Phase 8 Local Fallback Rule-Based Engine
   */
  localFallback(message: string): {
    reply: string;
    intent: NegotiatorIntent;
    sentiment: NegotiatorSentiment;
    confidence: number;
    recommended_action: string;
  } {
    const msg = message.toLowerCase().trim();
    let intent: NegotiatorIntent = "UNKNOWN";
    let sentiment: NegotiatorSentiment = normalizeSentiment("NEUTRAL", message);
    let reply = "";
    let recommended_action = "WAIT_AND_RETRY";

    if (
      msg.includes("what i want to do") ||
      msg.includes("what should i do") ||
      msg.includes("what to do") ||
      msg.includes("how to pay") ||
      msg.includes("help") ||
      msg.includes("options") ||
      msg.includes("what next")
    ) {
      intent = "CUSTOMER_CONFUSED";
      reply =
        "To resolve your payment session smoothly, you have 3 quick options: 1) Click the secure Razorpay payment link sent to your email/SMS, 2) Retry checkout with an alternate card, UPI ID, or Netbanking, or 3) Request more time if you need a temporary pause. Would you like me to send a fresh payment link?";
      recommended_action = "WANTS_NEW_PAYMENT_LINK";
    } else if (msg.includes("tomorrow") || msg.includes("pay later") || msg.includes("next week") || msg.includes("pay by")) {
      intent = "PROMISE_TO_PAY";
      reply = "Thank you for letting us know! We have registered your commitment to pay and will pause retries until then.";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("more time") || msg.includes("need time") || msg.includes("few days")) {
      intent = "NEEDS_MORE_TIME";
      reply = "No problem at all! We can pause automated attempts and give you more time to complete your payment.";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("expired") || msg.includes("expiry")) {
      intent = "CARD_EXPIRED";
      reply = "It looks like your payment card has expired. Please update your payment method or use a fresh card/UPI link to complete checkout.";
      recommended_action = "REQUEST_NEW_PAYMENT_METHOD";
    } else if (msg.includes("already paid") || msg.includes("paid already") || msg.includes("charged")) {
      intent = "PAYMENT_ALREADY_DONE";
      reply = "Thank you for informing us! We are verifying your charge status on our end now to ensure you are not double-billed.";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("failed again") || msg.includes("declined again")) {
      intent = "PAYMENT_FAILED_AGAIN";
      reply = "We apologize for the inconvenience. Would you like us to generate a fresh payment link for you?";
      recommended_action = "WANTS_NEW_PAYMENT_LINK";
    } else if (msg.includes("payment link") || msg.includes("checkout link") || msg.includes("send link") || msg.includes("url")) {
      intent = "WANTS_NEW_PAYMENT_LINK";
      reply = "Here is your secure payment checkout link to complete the transaction.";
      recommended_action = "WANTS_NEW_PAYMENT_LINK";
    } else if (msg.includes("cannot pay") || msg.includes("can't pay") || msg.includes("no money")) {
      intent = "CANNOT_PAY_NOW";
      reply = "We understand. Please take your time, or reach out to us if you need to discuss flexible payment options.";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("dispute") || msg.includes("wrong charge") || msg.includes("scam")) {
      intent = "DISPUTES_PAYMENT";
      reply = "We take payment concerns very seriously. I am transferring your query to our merchant support team for manual review.";
      recommended_action = "ESCALATE_TO_MERCHANT";
    } else if (msg.includes("why did") || msg.includes("what is this") || msg.includes("confused")) {
      intent = "CUSTOMER_CONFUSED";
      reply = "This payment attempt was for your recent purchase checkout. Let us know if you need help with your order details.";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("cancel") || msg.includes("stop") || msg.includes("opt me out")) {
      intent = "CUSTOMER_CANCELLED";
      reply = "We have updated your status and stopped further payment recovery attempts.";
      recommended_action = "STOP_RECOVERY";
    } else if (msg === "hi" || msg === "hello" || msg === "hey" || msg.startsWith("hi ") || msg.startsWith("hello ")) {
      intent = "UNKNOWN";
      reply = "Hello! I am RECOVRA's AI Recovery Assistant. I am here to help you resolve your payment attempt smoothly. How can I assist you today?";
      recommended_action = "WAIT_AND_RETRY";
    } else if (msg.includes("shut up") || msg.includes("get lost") || msg.includes("annoying") || msg.includes("hate")) {
      intent = "CUSTOMER_CANCELLED";
      sentiment = "FRUSTRATED";
      reply = "We apologize for bothering you! I have paused automated notifications for your session.";
      recommended_action = "WAIT_AND_RETRY";
    } else {
      intent = "UNKNOWN";
      reply = `I am RECOVRA's AI Recovery Assistant. Regarding your query ("${message}"), your transaction can be completed securely via a fresh payment link, alternate card/UPI method, or by scheduling a retry. Would you like me to generate a fresh payment link?`;
      recommended_action = "WAIT_AND_RETRY";
    }

    return {
      reply,
      intent,
      sentiment,
      confidence: 0.90,
      recommended_action,
    };
  },

  async trackPromiseToPay(caseId: string, promisedTime: string, amount: number) {
    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: null,
      actor: "PROMISE_TRACKER",
      event_type: "PROMISE_CREATED",
      reason: `Customer committed to pay. Reminder scheduled.`,
      result: `Promised amount: INR ${amount}. Promised time: ${promisedTime}`,
      metadata: { promised_amount: amount, promised_time: promisedTime, promise_status: "ACTIVE" },
    });
  },

  // Legacy helper
  async processMessage(input: any): Promise<any> {
    const res = await this.processChat({
      caseId: input.caseId,
      customerMessage: input.customerMessage,
      conversationHistory: input.conversationHistory,
      paymentContext: input.paymentContext,
    });
    return {
      reply: res.reply,
      intent: res.intent,
      sentiment: res.sentiment,
      confidence: Math.round(res.confidence * 100),
      recommended_action: res.recommended_action,
      merchant_escalation: res.policy_result === "ESCALATED",
      schedule_retry: res.recommended_action === "WAIT_AND_RETRY",
      retry_after_hours: res.intent === "PROMISE_TO_PAY" ? 24 : null,
    };
  },
};
