import { NextRequest, NextResponse } from "next/server";
import { negotiatorService } from "@/src/services/negotiator.service";
import { recoveryService } from "@/src/services/recovery.service";
import { supabase } from "@/src/lib/supabase";
import { checkRateLimit, sanitizeString, validatePayload } from "@/src/lib/security";
import { logger } from "@/src/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "anonymous";

    // Rate Limiting Gate (max 20 requests per minute per IP)
    const rateLimit = checkRateLimit(`negotiator_msg_${clientIp}`, 20, 60000);
    if (!rateLimit.allowed) {
      logger.warn("Negotiator message rate limit exceeded", { clientIp });
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }

    // Payload validation
    const val = validatePayload(body, ["caseId", "customerMessage"]);
    if (!val.valid) {
      return NextResponse.json(
        { error: `Missing required fields: ${val.missing.join(", ")}` },
        { status: 400 }
      );
    }

    const caseId = sanitizeString(body.caseId);
    const customerMessage = sanitizeString(body.customerMessage);

    if (!caseId || !customerMessage) {
      return NextResponse.json(
        { error: "Invalid payload input parameters" },
        { status: 400 }
      );
    }

    // 1. Fetch case details
    const caseDetails = await recoveryService.getRecoveryCaseById(caseId);
    if (!caseDetails) {
      return NextResponse.json({ error: `Recovery case not found: ${caseId}` }, { status: 404 });
    }

    // 2. Fetch conversation history
    const { data: rawHistory, error: historyError } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", caseId)
      .order("created_at", { ascending: true });

    if (historyError) {
      throw historyError;
    }

    const conversationHistory = (rawHistory || []).map((msg) => ({
      role: msg.role,
      message: msg.message,
    }));

    // 3. Process dialogue message using Negotiator Service
    const aiResponse = await negotiatorService.processMessage({
      caseId,
      customerMessage,
      conversationHistory,
      paymentContext: caseDetails.payments,
    });

    return NextResponse.json(aiResponse);
  } catch (err: any) {
    logger.error("Negotiator Message API error", err);
    return NextResponse.json(
      { error: err.message || "Failed to process negotiator message" },
      { status: 500 }
    );
  }
}
