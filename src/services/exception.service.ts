import { supabase } from "../lib/supabase";
import { auditService } from "./audit.service";

export type ExceptionType =
  | "RAZORPAY_API_ERROR"
  | "WEBHOOK_SIGNATURE_INVALID"
  | "GEMINI_QUOTA_EXCEEDED"
  | "DATABASE_ERROR"
  | "POLICY_BLOCK"
  | "MAX_RETRIES_EXCEEDED"
  | "UNKNOWN_PAYMENT"
  | "DUPLICATE_WEBHOOK"
  | "INTERNAL_SERVER_ERROR";

export type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExceptionItem {
  id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  source: string;
  related_entity_id: string | null;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
}

export const exceptionService = {
  /**
   * Log a new exception into Supabase audit trail.
   */
  async createException(input: {
    merchant_id?: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    source: string;
    message: string;
    related_entity_id?: string | null;
  }): Promise<ExceptionItem> {
    const id = `exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = new Date().toISOString();

    const exceptionItem: ExceptionItem = {
      id,
      type: input.type,
      severity: input.severity,
      source: input.source,
      related_entity_id: input.related_entity_id || null,
      message: input.message,
      resolved: false,
      created_at: createdAt,
    };

    await auditService.createAuditLog({
      recovery_case_id: input.related_entity_id || null,
      payment_id: null,
      actor: input.source,
      event_type: "EXCEPTION_CREATED",
      reason: `Exception [${input.type}]: ${input.message}`,
      result: `Severity: ${input.severity}. Status: Unresolved.`,
      metadata: exceptionItem,
    });

    return exceptionItem;
  },

  /**
   * Fetch all exceptions (derived from EXCEPTION_CREATED, POLICY_BLOCKED, POLICY_ESCALATED audit logs).
   */
  async getExceptions(): Promise<ExceptionItem[]> {
    const { data: auditLogs, error } = await supabase
      .from("audit_logs")
      .select("*")
      .in("event_type", ["EXCEPTION_CREATED", "EXCEPTION_RESOLVED", "POLICY_BLOCKED", "POLICY_ESCALATED"])
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const itemsMap = new Map<string, ExceptionItem>();

    (auditLogs || []).forEach((log) => {
      if (log.event_type === "EXCEPTION_CREATED" && log.metadata?.id) {
        if (!itemsMap.has(log.metadata.id)) {
          itemsMap.set(log.metadata.id, {
            id: log.metadata.id,
            type: log.metadata.type || "INTERNAL_SERVER_ERROR",
            severity: log.metadata.severity || "HIGH",
            source: log.actor || "SYSTEM",
            related_entity_id: log.recovery_case_id || log.metadata.related_entity_id || null,
            message: log.metadata.message || log.reason || "Operational exception occurred.",
            resolved: false,
            created_at: log.created_at || new Date().toISOString(),
          });
        }
      } else if (log.event_type === "EXCEPTION_RESOLVED" && log.metadata?.id) {
        const item = itemsMap.get(log.metadata.id);
        if (item) {
          item.resolved = true;
          item.resolved_at = log.created_at;
        }
      } else if (log.event_type === "POLICY_BLOCKED" || log.event_type === "POLICY_ESCALATED") {
        const synthId = `exc_pol_${log.id}`;
        if (!itemsMap.has(synthId)) {
          itemsMap.set(synthId, {
            id: synthId,
            type: "POLICY_BLOCK",
            severity: log.event_type === "POLICY_BLOCKED" ? "HIGH" : "MEDIUM",
            source: log.actor || "SAFETY_POLICY_ENGINE",
            related_entity_id: log.recovery_case_id || null,
            message: log.reason || "Safety policy gate interrupt.",
            resolved: false,
            created_at: log.created_at || new Date().toISOString(),
          });
        }
      }
    });

    return Array.from(itemsMap.values());
  },

  /**
   * Mark an exception resolved.
   */
  async resolveException(id: string): Promise<ExceptionItem> {
    const exceptions = await this.getExceptions();
    const target = exceptions.find((e) => e.id === id);

    if (!target) {
      throw new Error(`Exception not found: ${id}`);
    }

    if (target.resolved) {
      throw new Error(`Exception is already resolved: ${id}`);
    }

    const resolvedTime = new Date().toISOString();

    await auditService.createAuditLog({
      recovery_case_id: target.related_entity_id || null,
      payment_id: null,
      actor: "OPERATOR",
      event_type: "EXCEPTION_RESOLVED",
      reason: `Exception [${target.type}] marked resolved by operator.`,
      result: `Resolved exception ID: ${id}`,
      metadata: { id, resolved_at: resolvedTime },
    });

    return {
      ...target,
      resolved: true,
      resolved_at: resolvedTime,
    };
  },
};
