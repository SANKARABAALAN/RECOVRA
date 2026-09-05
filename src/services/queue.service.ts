import { getSupabaseAdmin } from "@/src/lib/supabase";
import { auditService } from "./audit.service";
import { logger } from "@/src/lib/logger";

export type QueueJobStatus = "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED";
export type QueueActionType = "WAIT_AND_RETRY" | "SEND_PAYMENT_LINK" | "REQUEST_NEW_PAYMENT_METHOD" | "STOP_RECOVERY";

export interface RecoveryJob {
  id: string;
  recovery_case_id: string;
  payment_id: string;
  action_type: QueueActionType;
  scheduled_at: string;
  retry_attempt: number;
  status: QueueJobStatus;
  created_at: string;
  updated_at?: string;
  payment_link_url?: string | null;
  error_message?: string | null;
}

export const queueService = {
  /**
   * Enqueue a new recovery job in the persistent queue.
   * Idempotent: Prevents duplicate active queued jobs for the same case & attempt.
   */
  async enqueueJob(input: {
    recovery_case_id: string;
    payment_id: string;
    action_type: QueueActionType;
    scheduled_at: string;
    retry_attempt: number;
    merchant_id: string;
  }): Promise<RecoveryJob> {
    const db: any = getSupabaseAdmin();
    const jobId = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    const job: RecoveryJob = {
      id: jobId,
      recovery_case_id: input.recovery_case_id,
      payment_id: input.payment_id,
      action_type: input.action_type,
      scheduled_at: input.scheduled_at,
      retry_attempt: input.retry_attempt,
      status: "QUEUED",
      created_at: nowStr,
    };

    const idempotencyKey = `${input.recovery_case_id}:${input.action_type}:${input.retry_attempt}`;
    const { data, error } = await db.from("recovery_queue").insert({
      id: job.id,
      recovery_case_id: input.recovery_case_id,
      merchant_id: input.merchant_id,
      payment_id: input.payment_id,
      action_type: input.action_type,
      scheduled_retry_at: input.scheduled_at,
      attempt_count: input.retry_attempt,
      status: "QUEUED",
      idempotency_key: idempotencyKey,
    }).select().single();
    if (error) {
      throw new Error(`Unable to persist recovery job: ${error.message}`);
    }

    // Log RECOVERY_JOB_CREATED in Audit Trail
    await auditService.createAuditLog({
      recovery_case_id: input.recovery_case_id,
      payment_id: input.payment_id,
      actor: "RECOVERY_QUEUE",
      event_type: "RECOVERY_JOB_CREATED",
      reason: `Recovery job created for action '${input.action_type}' (Attempt #${input.retry_attempt})`,
      result: `Job ID: ${job.id}. Scheduled for ${input.scheduled_at}`,
      metadata: job,
    });

    return { ...job, id: data.id };
  },

  /**
   * Get all queued jobs from Supabase & Memory.
   */
  async getQueuedJobs(): Promise<RecoveryJob[]> {
    const db: any = getSupabaseAdmin();
    const { data, error } = await db.from("recovery_queue").select("*").eq("status", "QUEUED").order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to read recovery queue: ${error.message}`);
    return (data || []).map((j: any) => ({
      id: j.id, recovery_case_id: j.recovery_case_id, payment_id: j.payment_id,
      action_type: j.action_type, scheduled_at: j.scheduled_retry_at,
      retry_attempt: j.attempt_count, status: j.status, created_at: j.created_at,
      updated_at: j.updated_at, payment_link_url: j.payment_link_url, error_message: j.error_message,
    }));
  },

  /**
   * Update job status in persistent queue.
   */
  async updateJobStatus(jobId: string, updates: Partial<RecoveryJob>): Promise<RecoveryJob> {
    const db: any = getSupabaseAdmin();
    const { data, error } = await db.from("recovery_queue").update({
      status: updates.status, payment_link_url: updates.payment_link_url || null,
      error_message: updates.error_message || null, updated_at: new Date().toISOString(),
    }).eq("id", jobId).select().single();
    if (error) throw new Error(`Unable to update recovery job: ${error.message}`);
    return { id: data.id, recovery_case_id: data.recovery_case_id, payment_id: data.payment_id,
      action_type: data.action_type, scheduled_at: data.scheduled_retry_at, retry_attempt: data.attempt_count,
      status: data.status, created_at: data.created_at, updated_at: data.updated_at,
      payment_link_url: data.payment_link_url, error_message: data.error_message };
  },
};
