import { supabase } from "../lib/supabase";
import { auditService } from "./audit.service";

export interface RecoveryCase {
  id?: string;
  payment_id: string;
  merchant_id: string;
  current_stage: string;
  recovery_status: string;
  confidence_score: number | null;
  recommended_action: string | null;
  customer_intent: string | null;
  scheduled_retry_at: string | null;
  failure_reason?: string | null;
  recovery_priority?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Phase 5 Allowed Stages
export const ALLOWED_STAGES = [
  "DETECTED",
  "DIAGNOSING",
  "EVALUATING",
  "DECIDED",
  "WAITING",
  "NEGOTIATING",
  "ACTION_SELECTED",
  "RECOVERED",
  "CLOSED",
] as const;

export type RecoveryStage = (typeof ALLOWED_STAGES)[number];

// Valid Stage Transition Matrix
const VALID_TRANSITIONS: Record<string, string[]> = {
  DETECTED: ["DIAGNOSING", "EVALUATING", "DECIDED", "WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"],
  DIAGNOSING: ["EVALUATING", "DECIDED", "WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"],
  EVALUATING: ["DECIDED", "WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"],
  DECIDED: ["WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"],
  WAITING: ["RECOVERED", "CLOSED", "DECIDED", "WAITING", "NEGOTIATING"],
  NEGOTIATING: ["RECOVERED", "CLOSED", "WAITING", "DECIDED"],
  ACTION_SELECTED: ["WAITING", "NEGOTIATING", "RECOVERED", "CLOSED"],
  RECOVERED: [], // Terminal stage
  CLOSED: [], // Terminal stage
};

export const recoveryService = {
  /**
   * State Machine Transition Validator
   */
  validateStageTransition(fromStage: string, toStage: string): { valid: boolean; reason: string } {
    if (!ALLOWED_STAGES.includes(toStage as any)) {
      return {
        valid: false,
        reason: `Invalid target stage: '${toStage}'. Allowed stages are: ${ALLOWED_STAGES.join(", ")}.`,
      };
    }

    if (fromStage === "CLOSED" || fromStage === "RECOVERED") {
      return {
        valid: false,
        reason: `Cannot update a terminal case in stage '${fromStage}'.`,
      };
    }

    const allowedNext = VALID_TRANSITIONS[fromStage] || [];
    if (!allowedNext.includes(toStage)) {
      return {
        valid: false,
        reason: `Invalid stage transition from '${fromStage}' to '${toStage}'. Valid next stages are: ${allowedNext.join(", ")}.`,
      };
    }

    return { valid: true, reason: "Valid transition." };
  },

  async getRecoveryCases(): Promise<any[]> {
    const { data, error } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((c) => ({
      ...c,
      failure_reason: c.payments?.failure_reason || "Declined",
      recovery_priority: c.customer_intent || "MEDIUM",
    }));
  },

  async getRecoveryCaseById(id: string): Promise<any> {
    const { data: recoveryCase, error: caseError } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", id)
      .maybeSingle();

    if (caseError) {
      throw caseError;
    }
    if (!recoveryCase) {
      return null;
    }

    const { data: audits, error: auditError } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .order("created_at", { ascending: true });

    if (auditError) {
      throw auditError;
    }

    return {
      ...recoveryCase,
      failure_reason: recoveryCase.payments?.failure_reason || "Declined",
      recovery_priority: recoveryCase.customer_intent || "MEDIUM",
      audits: audits || [],
    };
  },

  async createRecoveryCase(
    recoveryCase: Omit<RecoveryCase, "id" | "created_at" | "updated_at">
  ): Promise<RecoveryCase> {
    const { data, error } = await supabase
      .from("recovery_cases")
      .insert(recoveryCase)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async updateRecoveryCase(id: string, updates: Partial<RecoveryCase>): Promise<RecoveryCase> {
    const { data, error } = await supabase
      .from("recovery_cases")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Automatic Recovery Case Creation for FAILED payments.
   * Prevents duplicates and sets stage=DETECTED, status=ACTIVE.
   */
  async processPaymentFailure(paymentId: string): Promise<any | null> {
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error(`Failure Detector: payment not found with id ${paymentId}`);
      return null;
    }

    const { data: existingCase, error: caseError } = await supabase
      .from("recovery_cases")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (caseError) {
      throw caseError;
    }

    if (existingCase) {
      return {
        ...existingCase,
        failure_reason: payment.failure_reason,
        recovery_priority: existingCase.customer_intent || "MEDIUM",
      };
    }

    const amt = Number(payment.amount);
    const priority = amt > 10000 ? "HIGH" : amt < 1000 ? "LOW" : "MEDIUM";

    const newCase = await this.createRecoveryCase({
      payment_id: paymentId,
      merchant_id: payment.merchant_id,
      current_stage: "DETECTED",
      recovery_status: "ACTIVE",
      confidence_score: null,
      recommended_action: null,
      customer_intent: priority,
      scheduled_retry_at: null,
    });

    await auditService.createAuditLog({
      recovery_case_id: newCase.id!,
      payment_id: paymentId,
      actor: "SYSTEM",
      event_type: "CASE_CREATED",
      reason: `Failed payment detected. Reason: ${payment.failure_reason || "declined"}.`,
      result: `Created recovery case ${newCase.id} in stage DETECTED with status ACTIVE.`,
      metadata: { failure_reason: payment.failure_reason, amount: payment.amount },
    });

    return {
      ...newCase,
      failure_reason: payment.failure_reason,
      recovery_priority: priority,
    };
  },

  /**
   * Transition Recovery Stage using State Machine Validation
   */
  async transitionStage(caseId: string, toStage: string, reason?: string): Promise<any> {
    const caseDetails = await this.getRecoveryCaseById(caseId);
    if (!caseDetails) {
      throw new Error(`Recovery case not found: ${caseId}`);
    }

    const check = this.validateStageTransition(caseDetails.current_stage, toStage);
    if (!check.valid) {
      throw new Error(check.reason);
    }

    let status = caseDetails.recovery_status;
    if (toStage === "RECOVERED") {
      status = "Recovered";
    } else if (toStage === "CLOSED") {
      status = "Closed";
    } else if (toStage === "WAITING") {
      status = "Waiting";
    } else {
      status = "ACTIVE";
    }

    const updatedCase = await this.updateRecoveryCase(caseId, {
      current_stage: toStage,
      recovery_status: status,
    });

    let eventType = "STAGE_CHANGED";
    if (toStage === "CLOSED") eventType = "CASE_CLOSED";
    if (toStage === "RECOVERED") eventType = "CASE_RECOVERED";

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: caseDetails.payment_id,
      actor: "SYSTEM",
      event_type: eventType,
      reason: reason || `Transitioned recovery stage from ${caseDetails.current_stage} to ${toStage}.`,
      result: `Stage updated to ${toStage}. Status set to ${status}.`,
      metadata: { from_stage: caseDetails.current_stage, to_stage: toStage, status },
    });

    return updatedCase;
  },

  /**
   * Schedule Retry in Recovery Scheduler
   */
  async scheduleRetry(caseId: string, retryDelayHours?: number): Promise<any> {
    const caseDetails = await this.getRecoveryCaseById(caseId);
    if (!caseDetails) {
      throw new Error(`Recovery case not found: ${caseId}`);
    }

    if (caseDetails.current_stage === "CLOSED" || caseDetails.current_stage === "RECOVERED") {
      throw new Error(`Cannot schedule retries for a case in stage '${caseDetails.current_stage}'.`);
    }

    const { data: retryAudits } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", caseId)
      .eq("event_type", "RETRY_SCHEDULED");

    const maxRetries = Number(process.env.MAX_RETRIES) || 4;
    const retryCount = (retryAudits || []).length;

    if (retryCount >= maxRetries) {
      await this.updateRecoveryCase(caseId, {
        current_stage: "CLOSED",
        recovery_status: "Closed",
        scheduled_retry_at: null,
      });

      await auditService.createAuditLog({
        recovery_case_id: caseId,
        payment_id: caseDetails.payment_id,
        actor: "SYSTEM",
        event_type: "CASE_CLOSED",
        reason: `Maximum retries limit (${maxRetries}) exceeded. Case automatically closed.`,
        result: `Closed case ${caseId}.`,
        metadata: { maxRetries, retryCount },
      });

      throw new Error(`Maximum retries limit (${maxRetries}) reached. Case closed.`);
    }

    const delayHours = retryDelayHours || 2;
    const scheduledTime = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

    const updatedCase = await this.updateRecoveryCase(caseId, {
      scheduled_retry_at: scheduledTime,
      current_stage: caseDetails.current_stage === "DETECTED" ? "WAITING" : caseDetails.current_stage,
      recovery_status: "Waiting",
    });

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: caseDetails.payment_id,
      actor: "SYSTEM",
      event_type: "RETRY_SCHEDULED",
      reason: `Automated retry attempt #${retryCount + 1} scheduled in ${delayHours} hours.`,
      result: `Next retry set for ${scheduledTime}.`,
      metadata: { retryCount: retryCount + 1, maxRetries, scheduled_retry_at: scheduledTime },
    });

    return {
      case: updatedCase,
      scheduled_retry_at: scheduledTime,
      retryCount: retryCount + 1,
      maxRetries,
    };
  },

  async getRecoveryMetrics(): Promise<any> {
    const { data: payments } = await supabase.from("payments").select("*");
    const { data: cases } = await supabase.from("recovery_cases").select("*");

    const allPayments = payments || [];
    const allCases = cases || [];

    const failedPayments = allPayments.filter((p) => p.status === "Failed");
    const revenueAtRisk = failedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const recoveredCases = allCases.filter(
      (c) => c.recovery_status === "Recovered" || c.current_stage === "RECOVERED"
    );
    const revenueRecovered = recoveredCases.reduce((sum, c) => {
      const match = allPayments.find((p) => p.id === c.payment_id);
      return sum + (match ? Number(match.amount) : 0);
    }, 0);

    const activeCasesCount = allCases.filter(
      (c) =>
        c.current_stage !== "CLOSED" &&
        c.current_stage !== "RECOVERED" &&
        c.recovery_status !== "Closed" &&
        c.recovery_status !== "Recovered"
    ).length;

    const waitingCasesCount = allCases.filter(
      (c) => c.current_stage === "WAITING" || c.recovery_status === "Waiting"
    ).length;

    const closedCasesCount = allCases.filter(
      (c) => c.current_stage === "CLOSED" || c.recovery_status === "Closed" || c.recovery_status === "Failed"
    ).length;

    const totalCasesCount = allCases.length;

    const recoverySuccessRate =
      revenueAtRisk + revenueRecovered > 0
        ? ((revenueRecovered / (revenueAtRisk + revenueRecovered)) * 100).toFixed(1)
        : "0.0";

    return {
      revenueAtRisk,
      revenueRecovered,
      totalCases: totalCasesCount,
      activeCases: activeCasesCount,
      recoveredCases: recoveredCases.length,
      waitingCases: waitingCasesCount,
      closedCases: closedCasesCount,
      successRate: Number(recoverySuccessRate),
    };
  },
};
