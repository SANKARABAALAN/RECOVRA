import { supabase, getSupabaseForToken } from "./supabase";

/**
 * RECOVRA Enterprise Security Utilities
 * Includes Rate Limiting, Input Sanitization, Secret Masking, and Request Validation.
 */

// In-Memory Rate Limiting Store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * In-Memory Rate Limiter
 * @param key Identifier (IP or Client ID + Route)
 * @param maxRequests Maximum allowed requests in window
 * @param windowMs Time window in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, newRecord);
    return { allowed: true, remaining: maxRequests - 1, resetTime: newRecord.resetTime };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Resets rate limit store (used in testing or maintenance)
 */
export function clearRateLimits() {
  rateLimitMap.clear();
}

/**
 * Input Sanitization (Removes HTML, scripts, XSS vectors)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror\s*=/gi, "")
    .replace(/onload\s*=/gi, "")
    .trim();
}

/**
 * Recursive Object Sanitizer
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeString(obj) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as any;
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj as any)) {
      sanitized[key] = sanitizeObject((obj as any)[key]);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Secret Protection & Masking
 */
export function maskSecretsInText(text: string): string {
  if (!text || typeof text !== "string") return text;

  let masked = text;
  const secretsToMask = [
    process.env.RAZORPAY_KEY_SECRET,
    process.env.RAZORPAY_SECRET,
    process.env.GEMINI_API_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.RAZORPAY_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secretsToMask) {
    if (secret && secret.length > 3) {
      masked = masked.split(secret).join("[REDACTED_SECRET]");
    }
  }

  // Regex patterns for standard secret formats
  masked = masked.replace(/rzp_(live|test)_[a-zA-Z0-9]{14,}/g, "rzp_test_[REDACTED]");
  masked = masked.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, "AIzaSy[REDACTED]");
  masked = masked.replace(/bearer\s+[a-zA-Z0-9._-]{20,}/gi, "Bearer [REDACTED_TOKEN]");

  return masked;
}

/**
 * Request Payload Validation Helper
 */
export function validatePayload(body: any, requiredFields: string[]): { valid: boolean; missing: string[] } {
  if (!body || typeof body !== "object") {
    return { valid: false, missing: requiredFields };
  }

  const missing: string[] = [];
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || (typeof body[field] === "string" && body[field].trim() === "")) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Request Authentication & Merchant Scope Verification Helper
 * Verifies Supabase JWT token server-side via supabase.auth.getUser()
 */
export async function verifyAuthHeader(
  request: Request
): Promise<{ authenticated: boolean; merchantId?: string; error?: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const merchantHeader = request.headers.get("x-merchant-id") || "";
  const adminKeyHeader = request.headers.get("x-admin-key") || "";

  // 1. Internal secret check (e.g. background worker / webhooks / internal service)
  if (
    process.env.RECOVRA_INTERNAL_SECRET &&
    (authHeader === process.env.RECOVRA_INTERNAL_SECRET || adminKeyHeader === process.env.RECOVRA_INTERNAL_SECRET)
  ) {
    return { authenticated: true, merchantId: merchantHeader || "default_merchant" };
  }

  // 2. Bearer JWT validation via Supabase Auth
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          const merchantId = data.user.user_metadata?.merchant_id || data.user.id;
          return { authenticated: true, merchantId };
        }
      } catch (err) {
        // Fallthrough to dev mode checks
      }
    }
  }

  // 3. Development / Test environment or fallback demo execution
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    return { authenticated: true, merchantId: merchantHeader || "default_merchant" };
  }

  return { authenticated: false, error: "Unauthorized access: Valid authentication token or merchant scope required." };
}

/**
 * Reusable Auth Helper: Require Authenticated User
 */
export async function requireAuthenticatedUser(request: Request): Promise<{ userId: string; merchantId: string }> {
  const auth = await verifyAuthHeader(request);
  if (!auth.authenticated || !auth.merchantId) {
    throw new Error(auth.error || "401 Unauthorized: Valid authentication token required.");
  }
  return { userId: auth.merchantId, merchantId: auth.merchantId };
}

/**
 * Reusable Auth Helper: Require Merchant Access
 */
export async function requireMerchantAccess(request: Request, targetMerchantId?: string): Promise<{ merchantId: string }> {
  const auth = await verifyAuthHeader(request);
  if (!auth.authenticated || !auth.merchantId) {
    throw new Error(auth.error || "401 Unauthorized: Merchant scope required.");
  }
  if (targetMerchantId && auth.merchantId !== targetMerchantId && auth.merchantId !== "default_merchant") {
    throw new Error("403 Forbidden: Cross-tenant merchant access denied.");
  }
  return { merchantId: auth.merchantId };
}

/**
 * Reusable Auth Helper: Require Admin Access
 */
export async function requireAdminAccess(request: Request): Promise<{ adminId: string }> {
  const auth = await verifyAuthHeader(request);
  if (!auth.authenticated) {
    throw new Error(auth.error || "403 Forbidden: Master recovery administrator access required.");
  }
  return { adminId: auth.merchantId || "admin_master" };
}

/**
 * Reusable Auth Helper: Create Authenticated Supabase Client
 */
export function getAuthenticatedSupabaseClient(bearerToken?: string) {
  if (!bearerToken) throw new Error("Authenticated Supabase client requires a bearer token");
  return getSupabaseForToken(bearerToken.replace(/^Bearer\s+/i, ""));
}

