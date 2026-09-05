import { auditService } from "./audit.service";
import { DecisionType } from "./decision.service";

export type PolicyResultType = "APPROVED" | "BLOCKED" | "ESCALATED";

export interface PolicyCheckOutput {
  allowed: boolean;
  policy_result: PolicyResultType;
  reason: string;
}

export interface PolicyCheckInput {
  proposed_decision: DecisionType | string;
  retry_count: number;
  last_retry_at?: string | null;
  customer_opt_out?: boolean;
  payment_status?: string | null;
  recovery_status?: string | null;
  current_stage?: string | null;
  category?: string | null;
}

export const policyService = {
  /**
   * Deterministic Safety Policy Engine
   * Evaluates proposed strategy decisions against safety guardrails.
   */
  async evaluatePolicy(
    caseId: string,
    paymentId: string | null,
    input: PolicyCheckInput
  ): Promise<PolicyCheckOutput> {
    const maxRetries = Number(process.env.MAX_RETRIES) || 4;
    const cooldownMinutes = Number(process.env.RETRY_COOLDOWN_MINUTES) || 5;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    let allowed = true;
    let policy_result: PolicyResultType = "APPROVED";
    let reason = "Policy check passed: Strategy approved for execution.";

    const decision = input.proposed_decision;
    const stage = (input.current_stage || "").toUpperCase();
    const status = (input.recovery_status || "").toUpperCase();
    const payStatus = (input.payment_status || "").toUpperCase();
    const category = (input.category || "").toUpperCase();

    // RULE 1: Closed Recovery Case
    if (stage === "CLOSED" || status === "CLOSED") {
      allowed = false;
      policy_result = "BLOCKED";
      reason = "Blocked: Recovery case is closed.";
    }
    // RULE 2: Already Recovered Payment
    else if (payStatus === "SUCCESS" || status === "RECOVERED" || stage === "RECOVERED") {
      allowed = false;
      policy_result = "BLOCKED";
      reason = "Blocked: Payment already successfully recovered.";
    }
    // RULE 3: Refunded Payment
    else if (payStatus === "REFUNDED") {
      allowed = false;
      policy_result = "BLOCKED";
      reason = "Blocked: Payment has already been refunded.";
    }
    // RULE 4: Customer Opt-Out / STOP_RECOVERY
    else if (input.customer_opt_out || decision === "STOP_RECOVERY" || status === "CANCELLED") {
      allowed = false;
      policy_result = "BLOCKED";
      reason = "Blocked: Customer opted out or cancelled recovery.";
    }
    // RULE 5: Retry Limit Exceeded
    else if (input.retry_count >= maxRetries) {
      allowed = false;
      policy_result = "BLOCKED";
      reason = `Blocked: Maximum retries limit (${maxRetries}) exceeded.`;
    }
    // RULE 6: Cooldown Active
    else if (input.last_retry_at) {
      const elapsed = Date.now() - new Date(input.last_retry_at).getTime();
      if (elapsed < cooldownMs) {
        allowed = false;
        policy_result = "BLOCKED";
        reason = `Blocked: Cooldown period active. Must wait ${Math.ceil((cooldownMs - elapsed) / 1000)}s before next attempt.`;
      }
    }

    // RULE 7: Escalation / Fraud Check
    if (allowed && (category === "FRAUD_CHECK" || decision === "ESCALATE_TO_MERCHANT")) {
      allowed = false;
      policy_result = "ESCALATED";
      reason = "Escalated: Flagged for merchant compliance review.";
    }

    // Audit Event Name Mapping
    let eventType: "POLICY_APPROVED" | "POLICY_BLOCKED" | "POLICY_ESCALATED" = "POLICY_APPROVED";
    if (policy_result === "BLOCKED") eventType = "POLICY_BLOCKED";
    if (policy_result === "ESCALATED") eventType = "POLICY_ESCALATED";

    // Record Audit Log
    if (caseId) {
      await auditService.createAuditLog({
        recovery_case_id: caseId,
        payment_id: paymentId,
        actor: "SAFETY_POLICY_ENGINE",
        event_type: eventType,
        reason,
        result: `Policy Result: ${policy_result}. Allowed: ${allowed}.`,
        metadata: {
          proposed_decision: decision,
          policy_result,
          allowed,
          retry_count: input.retry_count,
          maxRetries,
        },
      });
    }

    return {
      allowed,
      policy_result,
      reason,
    };
  },

  // Legacy helper
  async checkPolicy(recoveryCase: any, decision: any, retryHistory: any[]): Promise<any> {
    const res = await this.evaluatePolicy(recoveryCase.id, recoveryCase.payment_id, {
      proposed_decision: decision.recommended_action || decision.decision || "WAIT_AND_RETRY",
      retry_count: retryHistory.length,
      last_retry_at: retryHistory.length > 0 ? retryHistory[retryHistory.length - 1].created_at : null,
      payment_status: recoveryCase.payments?.status,
      recovery_status: recoveryCase.recovery_status,
      current_stage: recoveryCase.current_stage,
    });
    return {
      allowed: res.allowed,
      policy_reason: res.reason,
      next_retry_time: decision.scheduled_time || null,
      merchant_review_required: res.policy_result === "ESCALATED",
    };
  },
};
