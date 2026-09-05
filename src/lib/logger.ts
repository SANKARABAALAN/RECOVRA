import { maskSecretsInText } from "./security";

/**
 * RECOVRA Structured Logger Utility
 * Provides standardized logging for system events, AI diagnoses, policy checks, error tracking, and security protection.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT";

export interface LogContext {
  component?: string;
  action?: string;
  caseId?: string;
  merchantId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const sanitizedMsg = maskSecretsInText(message);
    const sanitizedContext: Record<string, any> = {};

    if (context) {
      for (const [key, val] of Object.entries(context)) {
        if (typeof val === "string") {
          sanitizedContext[key] = maskSecretsInText(val);
        } else {
          sanitizedContext[key] = val;
        }
      }
    }

    return {
      timestamp,
      level,
      message: sanitizedMsg,
      ...sanitizedContext,
    };
  }

  debug(message: string, context?: LogContext) {
    const logData = this.formatLog("DEBUG", message, context);
    console.log(`[DEBUG] [${logData.timestamp}] ${logData.message}`, context ? JSON.stringify(logData) : "");
  }

  info(message: string, context?: LogContext) {
    const logData = this.formatLog("INFO", message, context);
    console.log(`[INFO] [${logData.timestamp}] ${logData.message}`, context ? JSON.stringify(logData) : "");
  }

  warn(message: string, context?: LogContext) {
    const logData = this.formatLog("WARN", message, context);
    console.warn(`[WARN] [${logData.timestamp}] ${logData.message}`, context ? JSON.stringify(logData) : "");
  }

  error(message: string, error?: any, context?: LogContext) {
    const logData = this.formatLog("ERROR", message, {
      ...(context || {}),
      errorDetails: error?.message ? maskSecretsInText(error.message) : maskSecretsInText(String(error)),
      stack: error?.stack ? maskSecretsInText(error.stack) : undefined,
    });
    console.error(`[ERROR] [${logData.timestamp}] ${logData.message}`, logData);
  }

  audit(eventType: string, reason: string, result: string, context?: LogContext) {
    const maskedType = maskSecretsInText(eventType);
    const maskedReason = maskSecretsInText(reason);
    const maskedResult = maskSecretsInText(result);
    const logData = this.formatLog("AUDIT", `${maskedType}: ${maskedReason} -> ${maskedResult}`, {
      ...(context || {}),
      eventType: maskedType,
      reason: maskedReason,
      result: maskedResult,
    });
    console.log(`[AUDIT] [${logData.timestamp}] ${maskedType} | ${maskedReason} | ${maskedResult}`);
  }
}

export const logger = new Logger();
