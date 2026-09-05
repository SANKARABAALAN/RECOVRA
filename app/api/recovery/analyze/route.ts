import { NextRequest, NextResponse } from "next/server";
import { aiService } from "@/src/services/ai.service";
import { supabase } from "@/src/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payment_id, error_code, payment_method, amount, retry_count } = body;

    // 1. If payment_id is provided, load its active details from the database
    if (payment_id) {
      const { data: payment, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", payment_id)
        .maybeSingle();

      if (error || !payment) {
        return NextResponse.json(
          { success: false, error: `Payment not found: ${payment_id}` },
          { status: 404 }
        );
      }

      const analysis = await aiService.analyzePayment({
        payment_method: payment.payment_method,
        bank_code: null,
        error_code: payment.failure_reason,
        amount: Number(payment.amount),
        retry_count: retry_count || 0,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, analysis });
    }

    // 2. Otherwise process raw input arguments directly
    if (amount === undefined || !error_code) {
      return NextResponse.json(
        { success: false, error: "Missing required attributes: error_code and amount" },
        { status: 400 }
      );
    }

    const analysis = await aiService.analyzePayment({
      payment_method: payment_method || null,
      bank_code: null,
      error_code: error_code,
      amount: Number(amount),
      retry_count: retry_count || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    console.error("AI Analysis API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "AI Analysis failed" },
      { status: 500 }
    );
  }
}
