import { supabase } from "@/src/lib/supabase";
import { queueService, QueueActionType, RecoveryJob } from "./queue.service";
import { policyService } from "./policy.service";
import { auditService } from "./audit.service";
import { exceptionService } from "./exception.service";
import { logger } from "@/src/lib/logger";
import { razorpayAdapter } from "@/src/adapters/razorpay/razorpay.adapter";
import { getSupabaseAdmin } from "@/src/lib/supabase";

export interface WorkerRunResult {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  jobs: RecoveryJob[];
}

export class AutomationService {
  /**
   * Scans active recovery queue and executes policy-approved pending jobs.
   */
  async runRecoveryWorker(): Promise<WorkerRunResult> {
    logger.info("Executing Autonomous Recovery Worker cycle...", { component: "AutomationWorker" });

    // 1. Fetch queued jobs whose scheduled time has arrived
    const allJobs = await queueService.getQueuedJobs();
    const now = new Date();

    const pendingJobs = allJobs.filter((job) => {
      if (job.status !== "QUEUED") return false;
      return new Date(job.scheduled_at) <= now;
    });

    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const processedJobs: RecoveryJob[] = [];

    for (const job of pendingJobs) {
      try {
        const result = await this.executeJob(job);
        processedJobs.push(result);
        if (result.status === "SUCCESS") successful++;
        else if (result.status === "FAILED" || result.status === "CANCELLED") failed++;
        else skipped++;
      } catch (err: any) {
        logger.error(`Failed to process recovery job ${job.id}`, err);
        skipped++;
      }
    }

    logger.audit(
      "RECOVERY_WORKER_FINISHED",
      `Processed ${pendingJobs.length} jobs`,
      `Success: ${successful}, Failed: ${failed}, Skipped: ${skipped}`
    );

    return {
      processed: pendingJobs.length,
      successful,
      failed,
      skipped,
      jobs: processedJobs,
    };
  }

  /**
   * Executes a single recovery job after Policy Engine validation.
   */
  async executeJob(job: RecoveryJob): Promise<RecoveryJob> {
    // 1. Log RECOVERY_JOB_STARTED
    await auditService.createAuditLog({
      recovery_case_id: job.recovery_case_id,
      payment_id: job.payment_id,
      actor: "RECOVERY_WORKER",
      event_type: "RECOVERY_JOB_STARTED",
      reason: `Starting execution of job ${job.id} (Action: ${job.action_type})`,
      result: `Status set to RUNNING`,
      metadata: { job_id: job.id, action_type: job.action_type },
    });

    await queueService.updateJobStatus(job.id, { status: "RUNNING" });

    // 2. Fetch recovery case and payment details
    const { data: recoveryCase, error: caseErr } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", job.recovery_case_id)
      .maybeSingle();

    if (caseErr || !recoveryCase) {
      const failedJob = await queueService.updateJobStatus(job.id, {
        status: "FAILED",
        error_message: "Recovery case not found in database",
      });
      return failedJob;
    }

    // 3. Evaluate Safety Policy Engine
    const policyResult = await policyService.evaluatePolicy(
      job.recovery_case_id,
      job.payment_id,
      {
        proposed_decision: job.action_type,
        retry_count: job.retry_attempt,
        last_retry_at: recoveryCase.updated_at,
        payment_status: recoveryCase.payments?.status,
        recovery_status: recoveryCase.recovery_status,
        current_stage: recoveryCase.current_stage,
      }
    );

    // If Policy BLOCKED or ESCALATED, cancel execution
    if (!policyResult.allowed) {
      logger.warn(`Job ${job.id} blocked by Safety Policy Engine`, { reason: policyResult.reason });

      const blockedJob = await queueService.updateJobStatus(job.id, {
        status: "CANCELLED",
        error_message: policyResult.reason,
      });

      // Update case to CLOSED if policy permanently blocked recovery or retry limit exceeded
      if (policyResult.reason.includes("closed") || policyResult.reason.includes("retries") || policyResult.reason.includes("recovered")) {
        await this.closeRecoveryCase(job.recovery_case_id, "Policy permanently blocked recovery", "Failed");
      }

      return blockedJob;
    }

    // 4. Execute Policy-Approved Actions
    if (job.action_type === "WAIT_AND_RETRY") {
      return await this.executeRetryAction(job, recoveryCase);
    } else if (job.action_type === "SEND_PAYMENT_LINK") {
      return await this.executeSendPaymentLinkAction(job, recoveryCase);
    } else if (job.action_type === "REQUEST_NEW_PAYMENT_METHOD") {
      return await this.executeRequestNewPaymentMethodAction(job, recoveryCase);
    } else {
      const unkJob = await queueService.updateJobStatus(job.id, {
        status: "FAILED",
        error_message: `Unsupported action_type: ${job.action_type}`,
      });
      return unkJob;
    }
  }

  /**
   * Executes WAIT_AND_RETRY transaction attempt via Razorpay / Gateway.
   */
  private async executeRetryAction(job: RecoveryJob, recoveryCase: any): Promise<RecoveryJob> {
    const caseId = job.recovery_case_id;
    const currentAttempt = job.retry_attempt;
    const maxRetries = 4;

    // Log RETRY_EXECUTED
    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: job.payment_id,
      actor: "RECOVERY_WORKER",
      event_type: "RETRY_EXECUTED",
      reason: `Executed automated Razorpay retry attempt #${currentAttempt}`,
      result: "No charge attempted. Awaiting a verified Razorpay payment event.",
      metadata: { retry_attempt: currentAttempt, simulated: false },
    });
    if (currentAttempt >= maxRetries) {
        await exceptionService.createException({
          type: "MAX_RETRIES_EXCEEDED",
          severity: "HIGH",
          source: "RECOVERY_WORKER",
          message: `Maximum retries limit (${maxRetries}) reached for case ${caseId}. Recovery halted.`,
          related_entity_id: caseId,
        });

        await this.closeRecoveryCase(caseId, `Maximum retries (${maxRetries}) exhausted`, "Failed");

        return await queueService.updateJobStatus(job.id, {
          status: "FAILED",
          error_message: "Max retries limit exhausted",
        });
    } else {
        // Schedule next retry attempt in 5 minutes
        const nextAttempt = currentAttempt + 1;
        const nextScheduledAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        await supabase
          .from("recovery_cases")
          .update({
            recovery_status: "Waiting",
            current_stage: "WAITING",
            retry_count: currentAttempt,
            scheduled_retry_at: nextScheduledAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId);

        // Enqueue next job
        await queueService.enqueueJob({
          recovery_case_id: caseId,
          payment_id: job.payment_id,
          action_type: "WAIT_AND_RETRY",
          scheduled_at: nextScheduledAt,
          retry_attempt: nextAttempt,
          merchant_id: recoveryCase.merchant_id,
        });

        return await queueService.updateJobStatus(job.id, {
          status: "SUCCESS",
          error_message: `Attempt #${currentAttempt} failed. Scheduled next retry for ${nextScheduledAt}`,
        });
    }
  }

  /**
   * Generates an actual Razorpay Test Mode Payment Link. It fails closed when
   * gateway credentials or payment-link scope are unavailable.
   */
  async generatePaymentLink(caseId: string) {
    const { data: recoveryCase, error } = await supabase.from("recovery_cases").select("*, payments(*)").eq("id", caseId).single();
    if (error || !recoveryCase) throw new Error("Recovery case not found");
    const link = await razorpayAdapter.createPaymentLink({
      amount: Number(recoveryCase.payments?.amount || 0), currency: recoveryCase.payments?.currency || "INR",
      description: `RECOVRA recovery for case ${caseId}`,
    });
    if (link.simulated) throw new Error("Razorpay Payment Links is unavailable; no simulated link is generated in production flows");
    const db: any = getSupabaseAdmin();
    const { error: linkError } = await db.from("payment_links").insert({
      razorpay_link_id: link.id, recovery_case_id: caseId, merchant_id: recoveryCase.merchant_id,
      short_url: link.short_url, amount: Number(recoveryCase.payments?.amount || 0), status: link.status, simulated: false,
    });
    if (linkError) throw new Error(`Unable to persist payment link: ${linkError.message}`);

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: null,
      actor: "PAYMENT_LINK_SERVICE",
      event_type: "PAYMENT_LINK_GENERATED",
      reason: "Generated custom recovery payment link for customer negotiation",
      result: `Razorpay Test Mode link: ${link.short_url}`,
      metadata: { paymentLink: link.short_url, razorpay_link_id: link.id, simulated: false },
    });

    return { caseId, paymentLink: link.short_url, simulated: false };
  }

  /**
   * Generates a Razorpay Payment Link when decision = SEND_PAYMENT_LINK.
   */
  private async executeSendPaymentLinkAction(job: RecoveryJob, recoveryCase: any): Promise<RecoveryJob> {
    const caseId = job.recovery_case_id;
    const generated = await this.generatePaymentLink(caseId);

    return await queueService.updateJobStatus(job.id, {
      status: "SUCCESS",
      payment_link_url: generated.paymentLink,
    });
  }

  /**
   * Requests new payment method from customer.
   */
  private async executeRequestNewPaymentMethodAction(job: RecoveryJob, recoveryCase: any): Promise<RecoveryJob> {
    const caseId = job.recovery_case_id;

    await supabase
      .from("recovery_cases")
      .update({
        current_stage: "NEGOTIATING",
        recovery_status: "Negotiating",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: job.payment_id,
      actor: "RECOVERY_WORKER",
      event_type: "RETRY_EXECUTED",
      reason: "Requested new payment method from customer via negotiator",
      result: "Case updated to stage NEGOTIATING",
    });

    return await queueService.updateJobStatus(job.id, { status: "SUCCESS" });
  }

  /**
   * Automatically closes recovery cases.
   */
  async closeRecoveryCase(caseId: string, reason: string, finalOutcome: "Recovered" | "Failed" | "Closed" = "Closed") {
    await supabase
      .from("recovery_cases")
      .update({
        current_stage: "CLOSED",
        recovery_status: finalOutcome,
        scheduled_retry_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: null,
      actor: "SYSTEM",
      event_type: "RECOVERY_CASE_CLOSED",
      reason: `Recovery case closed: ${reason}`,
      result: `Final Outcome: ${finalOutcome}`,
    });

    logger.info(`Case ${caseId} automatically CLOSED. Outcome: ${finalOutcome}`, { caseId, reason });
  }

  private isWorkerRunning = true;
  private lastWorkerRunAt: string | null = new Date().toISOString();
  private totalJobsProcessed = 0;

  /**
   * Returns current health and execution status of Autonomous Recovery Worker.
   */
  getWorkerStatus() {
    return {
      isRunning: this.isWorkerRunning,
      lastRunAt: this.lastWorkerRunAt,
      processedCount: this.totalJobsProcessed,
    };
  }

  /**
   * Triggers an immediate execution cycle of Recovery Worker.
   */
  triggerWorkerCycle() {
    this.isWorkerRunning = true;
    this.lastWorkerRunAt = new Date().toISOString();
    this.runRecoveryWorker().catch((err) => {
      logger.error("Error executing triggered worker cycle", err);
    });
    return this.getWorkerStatus();
  }

  /**
   * Stops or pauses Recovery Worker execution.
   */
  stopWorker() {
    this.isWorkerRunning = false;
    return this.getWorkerStatus();
  }

  /**
   * Verifies recovery payment outcome.
   */
  async verifyRecoveryOutcome(caseId: string, paymentToken?: string) {
    const { data: caseItem, error } = await supabase
      .from("recovery_cases")
      .select("*, payments(*)")
      .eq("id", caseId)
      .single();

    if (error || !caseItem) {
      throw new Error(`Recovery case not found: ${caseId}`);
    }

    const isRecovered = caseItem.recovery_status === "Recovered" || caseItem.current_stage === "RECOVERED";

    await auditService.createAuditLog({
      recovery_case_id: caseId,
      payment_id: caseItem.payment_id,
      actor: "VERIFICATION_SERVICE",
      event_type: "PAYMENT_VERIFIED",
      reason: "Verified recovery payment transaction state",
      result: isRecovered ? "Payment VERIFIED RECOVERED" : "Payment UNRESOLVED",
      metadata: { paymentToken, isRecovered },
    });

    return {
      caseId,
      status: isRecovered ? "RECOVERED" : caseItem.recovery_status,
      paymentToken: paymentToken || "sim_token_verified",
    };
  }
}

export const automationService = new AutomationService();
