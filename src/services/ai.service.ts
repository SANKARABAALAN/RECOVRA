import { geminiClient } from "../lib/gemini";
import { supabase } from "../lib/supabase";
import { auditService } from "./audit.service";

export type RootCauseCategory =
  | "BANK_NETWORK"
  | "EXPIRED_CARD"
  | "INSUFFICIENT_FUNDS"
  | "CUSTOMER_CANCELLED"
  | "UPI_PIN_ERROR"
  | "PAYMENT_TIMEOUT"
  | "FRAUD_CHECK"
  | "UNKNOWN";

export interface AIDiagnosisInput {
  recovery_case_id?: string;
  payment_id?: string;
  payment_method: string | null;
  error_code: string | null;
  error_description?: string | null;
  amount: number;
  retry_count?: number;
  timestamp?: string;
}

export interface AIDiagnosisOutput {
  root_cause: string;
  category: RootCauseCategory;
  confidence: number; // 0.00 to 1.00 float
  reasoning: string;
  recommended_next_step: string;
  ai_engine: "GEMINI" | "LOCAL_FALLBACK";
}

/**
 * Category Mapper: Ensures every diagnosis belongs to exactly one category
 */
export function mapToCategory(errorCodeStr: string, rootCauseStr: string): RootCauseCategory {
  const text = `${errorCodeStr} ${rootCauseStr}`.toUpperCase();

  if (text.includes("EXPIRED") || text.includes("EXPIRY")) {
    return "EXPIRED_CARD";
  }
  if (text.includes("INSUFFICIENT") || text.includes("BALANCE") || text.includes("FUNDS")) {
    return "INSUFFICIENT_FUNDS";
  }
  if (text.includes("PIN") || text.includes("INCORRECT_PIN") || text.includes("AUTH_FAIL")) {
    return "UPI_PIN_ERROR";
  }
  if (text.includes("CANCEL") || text.includes("ABORT") || text.includes("DISMISSED")) {
    return "CUSTOMER_CANCELLED";
  }
  if (text.includes("RISK") || text.includes("FRAUD") || text.includes("BLOCKED") || text.includes("SUSPICIOUS")) {
    return "FRAUD_CHECK";
  }
  if (text.includes("GATEWAY_TIMEOUT") || text.includes("BANK_TIMEOUT") || text.includes("BANK") || text.includes("GATEWAY") || text.includes("NETWORK")) {
    return "BANK_NETWORK";
  }
  if (text.includes("TIMEOUT") || text.includes("TIMED_OUT") || text.includes("UPI_PENDING")) {
    return "PAYMENT_TIMEOUT";
  }

  return "UNKNOWN";
}

/**
 * Normalizes confidence to float between 0.00 and 1.00
 */
export function clampConfidence(score: number): number {
  let val = score;
  if (val > 1.0) {
    val = val / 100.0;
  }
  const clamped = Math.max(0.0, Math.min(1.0, val));
  return Number(clamped.toFixed(2));
}

export const aiService = {
  /**
   * Main Phase 6 Diagnosis Function
   */
  async diagnosePayment(input: AIDiagnosisInput): Promise<AIDiagnosisOutput> {
    const method = input.payment_method || "unknown";
    const errorCode = input.error_code || input.error_description || "UNKNOWN_ERROR";
    const amount = input.amount || 0;
    const retryCount = input.retry_count || 0;

    const prompt = `
You are the AI Root Cause Analyzer for RECOVRA, analyzing a failed Razorpay transaction.
Analyze this payment failure and explain why it likely failed.

Payment Details:
- Payment Method: ${method}
- Error Code / Description: ${errorCode}
- Amount: INR ${amount}
- Previous Retries: ${retryCount}

Classify into exactly one Category:
- BANK_NETWORK (temporary bank timeout, gateway network drop)
- EXPIRED_CARD (card expired)
- INSUFFICIENT_FUNDS (balance insufficient)
- CUSTOMER_CANCELLED (user cancelled checkout)
- UPI_PIN_ERROR (incorrect UPI PIN entered)
- PAYMENT_TIMEOUT (UPI request timed out)
- FRAUD_CHECK (risk decline, blocked card)
- UNKNOWN (unspecified)

Return a JSON object conforming exactly to this schema:
{
  "root_cause": string (A concise human-readable description of root cause),
  "category": "BANK_NETWORK" | "EXPIRED_CARD" | "INSUFFICIENT_FUNDS" | "CUSTOMER_CANCELLED" | "UPI_PIN_ERROR" | "PAYMENT_TIMEOUT" | "FRAUD_CHECK" | "UNKNOWN",
  "confidence": number (between 0.00 and 1.00),
  "reasoning": string (Clear diagnostic explanation),
  "recommended_next_step": "WAIT_AND_RETRY" | "REQUEST_NEW_PAYMENT_METHOD" | "TRIGGER_UPI_PUSH" | "HANDOFF_TO_MERCHANT" | "STOP_RECOVERY"
}
`;

    let diagnosis: AIDiagnosisOutput | null = null;

    // 1. Attempt Gemini Execution
    try {
      const responseText = await geminiClient.generateContent(prompt, {
        responseMimeType: "application/json",
      });

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);

      const cat = mapToCategory(errorCode, `${parsed.category} ${parsed.root_cause}`);
      const conf = clampConfidence(Number(parsed.confidence ?? 0.85));

      diagnosis = {
        root_cause: parsed.root_cause || "Gateway processing issue",
        category: cat,
        confidence: conf,
        reasoning: parsed.reasoning || `Gemini diagnosed failure code '${errorCode}'.`,
        recommended_next_step: parsed.recommended_next_step || "WAIT_AND_RETRY",
        ai_engine: "GEMINI",
      };
    } catch (err: any) {
      console.warn("AI Service: Gemini unavailable or errored. Using LOCAL_FALLBACK. Error:", err.message);
      diagnosis = this.localExpertFallback(input);
    }

    return diagnosis;
  },

  /**
   * Phase 6 Local Fallback Rule Engine
   */
  localExpertFallback(input: AIDiagnosisInput): AIDiagnosisOutput {
    const errCodeStr = (input.error_code || input.error_description || "").toUpperCase();
    const category = mapToCategory(errCodeStr, "");
    let root_cause = "Unspecified Gateway Error";
    let reasoning = "The transaction failed due to an unrecognized gateway code.";
    let recommended_next_step = "HANDOFF_TO_MERCHANT";
    let rawConfidence = 0.50;

    switch (category) {
      case "INSUFFICIENT_FUNDS":
        root_cause = "Insufficient Customer Account Balance";
        reasoning = "Customer bank account does not have sufficient balance to complete transaction.";
        recommended_next_step = "WAIT_AND_RETRY";
        rawConfidence = 0.95;
        break;

      case "BANK_NETWORK":
        root_cause = "Temporary Bank Server Issue";
        reasoning = "The issuing bank server timed out or failed to respond during gateway authorization.";
        recommended_next_step = "WAIT_AND_RETRY";
        rawConfidence = 0.91;
        break;

      case "EXPIRED_CARD":
        root_cause = "Card Past Expiration Date";
        reasoning = "The credit/debit card presented has expired.";
        recommended_next_step = "REQUEST_NEW_PAYMENT_METHOD";
        rawConfidence = 0.99;
        break;

      case "UPI_PIN_ERROR":
        root_cause = "Incorrect UPI Credentials";
        reasoning = "Customer entered an invalid UPI PIN or authorization code.";
        recommended_next_step = "TRIGGER_UPI_PUSH";
        rawConfidence = 0.95;
        break;

      case "PAYMENT_TIMEOUT":
        root_cause = "UPI Push Notification Timed Out";
        reasoning = "Customer did not approve the payment notification in their UPI app within timeout window.";
        recommended_next_step = "TRIGGER_UPI_PUSH";
        rawConfidence = 0.88;
        break;

      case "CUSTOMER_CANCELLED":
        root_cause = "User Aborted Payment Session";
        reasoning = "The customer manually closed the payment window before completing payment.";
        recommended_next_step = "STOP_RECOVERY";
        rawConfidence = 0.94;
        break;

      case "FRAUD_CHECK":
        root_cause = "Issuing Bank Security Block";
        reasoning = "Transaction flagged by risk management rules or blocked card restriction.";
        recommended_next_step = "HANDOFF_TO_MERCHANT";
        rawConfidence = 0.92;
        break;

      default:
        root_cause = "Unspecified Gateway Decline";
        reasoning = "Transaction declined by gateway with unknown failure code.";
        recommended_next_step = "HANDOFF_TO_MERCHANT";
        rawConfidence = 0.50;
        break;
    }

    const confidence = clampConfidence(rawConfidence);

    return {
      root_cause,
      category,
      confidence,
      reasoning,
      recommended_next_step,
      ai_engine: "LOCAL_FALLBACK",
    };
  },

  /**
   * Save Diagnosis to Supabase DB & Record Audit Log
   */
  async storeDiagnosis(caseId: string, diagnosis: AIDiagnosisOutput): Promise<any> {
    const { data: caseDetails, error: caseError } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", caseId)
      .single();

    if (caseError || !caseDetails) {
      throw new Error(`Recovery case not found: ${caseId}`);
    }

    // Update payment record failure_reason if payment exists
    if (caseDetails.payment_id) {
      await supabase
        .from("payments")
        .update({ failure_reason: diagnosis.root_cause })
        .eq("id", caseDetails.payment_id);
    }

    // Update recovery case diagnosis attributes
    const { data: updatedCase, error: updateError } = await supabase
      .from("recovery_cases")
      .update({
        customer_intent: diagnosis.root_cause,
        recommended_action: diagnosis.recommended_next_step,
        confidence_score: diagnosis.confidence * 100,
        current_stage: caseDetails.current_stage === "DETECTED" ? "DIAGNOSING" : caseDetails.current_stage,
        recovery_status: "Diagnosing",
      })
      .eq("id", caseId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Write audit log: DIAGNOSIS_CREATED
    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: caseDetails.payment_id,
      actor: diagnosis.ai_engine,
      event_type: "DIAGNOSIS_CREATED",
      reason: `AI root cause: ${diagnosis.root_cause} (${diagnosis.category}). Engine: ${diagnosis.ai_engine}.`,
      result: `Confidence: ${(diagnosis.confidence * 100).toFixed(0)}%. Reasoning: ${diagnosis.reasoning}`,
      metadata: {
        category: diagnosis.category,
        confidence: diagnosis.confidence,
        ai_engine: diagnosis.ai_engine,
        recommended_next_step: diagnosis.recommended_next_step,
      },
    });

    return {
      case: updatedCase,
      diagnosis,
    };
  },

  // Legacy helper for backward compatibility
  async analyzePayment(input: any): Promise<any> {
    const diag = await this.diagnosePayment({
      payment_method: input.payment_method,
      error_code: input.error_code,
      amount: input.amount,
      retry_count: input.retry_count,
    });
    return {
      root_cause: diag.root_cause,
      explanation: diag.reasoning,
      confidence_score: Math.round(diag.confidence * 100),
      severity: "MEDIUM",
      recommended_action: diag.recommended_next_step,
      retry_recommended: diag.recommended_next_step === "WAIT_AND_RETRY" || diag.recommended_next_step === "TRIGGER_UPI_PUSH",
      customer_message_summary: diag.reasoning,
      confidence_reasoning: `Engine: ${diag.ai_engine}`,
    };
  },
};
