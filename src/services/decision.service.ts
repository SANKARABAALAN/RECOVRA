import { RootCauseCategory } from "./ai.service";

export type DecisionType =
  | "WAIT_AND_RETRY"
  | "SEND_PAYMENT_LINK"
  | "REQUEST_NEW_PAYMENT_METHOD"
  | "ESCALATE_TO_MERCHANT"
  | "STOP_RECOVERY";

export interface DecisionOutput {
  decision: DecisionType;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  recommended_delay_minutes: number;
}

export const decisionService = {
  /**
   * Deterministic Decision Engine
   * Converts Phase 6 AI diagnosis & payment metadata into a recommended recovery decision.
   */
  generateDecision(diagnosis: {
    category: RootCauseCategory | string;
    root_cause?: string;
    confidence?: number;
    amount?: number;
    retry_count?: number;
  }): DecisionOutput {
    const category = (diagnosis.category || "UNKNOWN").toUpperCase();
    const confidence = diagnosis.confidence ?? 0.85;
    const amount = Number(diagnosis.amount || 0);

    let decision: DecisionType = "ESCALATE_TO_MERCHANT";
    let reason = "Unspecified failure category requiring manual merchant evaluation.";
    let priority: "HIGH" | "MEDIUM" | "LOW" = amount > 10000 ? "HIGH" : amount < 1000 ? "LOW" : "MEDIUM";
    let recommended_delay_minutes = 0;

    switch (category) {
      case "BANK_NETWORK":
        decision = "WAIT_AND_RETRY";
        reason = "Temporary bank network issue detected. High likelihood of success after cooldown.";
        recommended_delay_minutes = 30;
        break;

      case "PAYMENT_TIMEOUT":
        decision = "WAIT_AND_RETRY";
        reason = "Payment session timed out. Scheduling automated retry.";
        recommended_delay_minutes = 15;
        break;

      case "EXPIRED_CARD":
        decision = "REQUEST_NEW_PAYMENT_METHOD";
        reason = "The payment card is past expiration. Request customer to update card details.";
        recommended_delay_minutes = 0;
        break;

      case "INSUFFICIENT_FUNDS":
        decision = "SEND_PAYMENT_LINK";
        reason = "Insufficient funds in customer account. Send dynamic payment link for alternate method or later retry.";
        recommended_delay_minutes = 120;
        break;

      case "CUSTOMER_CANCELLED":
        decision = "STOP_RECOVERY";
        reason = "Customer manually cancelled or aborted checkout session. Halted auto-recovery to respect customer intent.";
        recommended_delay_minutes = 0;
        break;

      case "FRAUD_CHECK":
        decision = "ESCALATE_TO_MERCHANT";
        reason = "Security risk declination flagged by issuing bank filters. Escalate case to merchant compliance team.";
        priority = "HIGH";
        recommended_delay_minutes = 0;
        break;

      case "UNKNOWN":
      default:
        decision = "ESCALATE_TO_MERCHANT";
        reason = "Unrecognized error code. Escalating case to merchant review queue.";
        recommended_delay_minutes = 0;
        break;
    }

    // Override if confidence is very low (<= 0.40)
    if (confidence <= 0.40 && decision !== "STOP_RECOVERY") {
      decision = "ESCALATE_TO_MERCHANT";
      reason += ` Low confidence score (${(confidence * 100).toFixed(0)}%) requires merchant review.`;
      priority = "HIGH";
    }

    return {
      decision,
      reason,
      priority,
      recommended_delay_minutes,
    };
  },
};
