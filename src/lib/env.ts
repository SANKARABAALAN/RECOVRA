/**
 * RECOVRA Environment Variables Validation & Enterprise Config
 */

export interface EnvValidationResult {
  valid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  environment: "production" | "development" | "test";
  details: Record<string, { configured: boolean; maskedValue: string; required: boolean }>;
}

export function maskSecret(val: string | undefined): string {
  if (!val) return "NOT_SET";
  if (val.length <= 8) return "********";
  return `${val.substring(0, 4)}...${val.substring(val.length - 4)}`;
}

export function validateEnvironment(): EnvValidationResult {
  const nodeEnv = process.env.NODE_ENV || "development";

  const envSpecs = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", val: process.env.NEXT_PUBLIC_SUPABASE_URL, required: true },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", val: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, required: true },
    { key: "SUPABASE_SERVICE_ROLE_KEY", val: process.env.SUPABASE_SERVICE_ROLE_KEY, required: false },
    { key: "RAZORPAY_KEY_ID", val: process.env.RAZORPAY_KEY_ID, required: false },
    { key: "RAZORPAY_KEY_SECRET", val: process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET, required: false },
    { key: "GEMINI_API_KEY", val: process.env.GEMINI_API_KEY, required: false },
    { key: "NEXT_PUBLIC_APP_URL", val: process.env.NEXT_PUBLIC_APP_URL, required: false },
    { key: "RAZORPAY_WEBHOOK_SECRET", val: process.env.RAZORPAY_WEBHOOK_SECRET, required: false },
  ];

  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const details: Record<string, { configured: boolean; maskedValue: string; required: boolean }> = {};

  for (const spec of envSpecs) {
    const isConfigured = Boolean(spec.val && spec.val.trim().length > 0);
    details[spec.key] = {
      configured: isConfigured,
      maskedValue: isConfigured ? "CONFIGURED" : "NOT_SET",
      required: spec.required,
    };

    if (!isConfigured) {
      if (spec.required) {
        missingRequired.push(spec.key);
      } else {
        missingOptional.push(spec.key);
      }
    }
  }

  const valid = missingRequired.length === 0;

  if (!valid) {
    console.error(`[ENV_VALIDATION_ERROR] Missing required environment variables: ${missingRequired.join(", ")}`);
  }

  return {
    valid,
    missingRequired,
    missingOptional,
    environment: nodeEnv as any,
    details,
  };
}

export const env = {
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "") as string,
  supabaseAnonKey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "") as string,
  supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || "") as string,
  razorpayKeyId: (process.env.RAZORPAY_KEY_ID || "") as string,
  razorpayKeySecret: (process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || "") as string,
  geminiApiKey: (process.env.GEMINI_API_KEY || "") as string,
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000") as string,
  webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || "") as string,
};


export function validateEnv() {
  const result = validateEnvironment();
  return {
    valid: result.valid,
    missing: result.missingRequired,
    hasGemini: Boolean(env.geminiApiKey),
    hasRazorpay: Boolean(env.razorpayKeyId && env.razorpayKeySecret),
  };
}
