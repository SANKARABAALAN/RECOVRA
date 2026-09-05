import { supabase } from "../lib/supabase";

export interface AuditLog {
  id?: string;
  recovery_case_id: string | null;
  payment_id?: string | null;
  merchant_id?: string | null;
  actor: string;
  event_type: string;
  reason: string | null;
  result: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export const auditService = {
  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    return data || [];
  },

  async createAuditLog(log: Omit<AuditLog, "id" | "created_at">): Promise<AuditLog> {
    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        recovery_case_id: log.recovery_case_id || null,
        payment_id: log.payment_id || null,
        actor: log.actor,
        event_type: log.event_type,
        reason: log.reason || null,
        result: log.result || null,
        metadata: log.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return data;
  },

  async logEvent(params: {
    merchant_id?: string;
    recovery_case_id?: string | null;
    payment_id?: string | null;
    event_type: string;
    actor: string;
    reason: string;
    result: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    return this.createAuditLog({
      recovery_case_id: params.recovery_case_id || null,
      payment_id: params.payment_id || null,
      actor: params.actor,
      event_type: params.event_type,
      reason: params.reason,
      result: params.result,
      metadata: params.metadata || {},
    });
  },
};
