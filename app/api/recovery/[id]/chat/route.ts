import { NextRequest, NextResponse } from "next/server";
import { negotiatorService } from "@/src/services/negotiator.service";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required body parameter: message" },
        { status: 400 }
      );
    }

    const result = await negotiatorService.processChat({
      caseId: id,
      customerMessage: message,
    });

    return NextResponse.json({
      success: true,
      case_id: id,
      response: result,
    });
  } catch (err: any) {
    console.error("POST /api/recovery/[id]/chat error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process chat message" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing case ID parameter" }, { status: 400 });
    }

    const { data: convData, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    // Retrieve PROMISE_CREATED audit log if exists
    const { data: promiseLogs } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("recovery_case_id", id)
      .eq("event_type", "PROMISE_CREATED")
      .order("created_at", { ascending: false })
      .limit(1);

    const promise = promiseLogs && promiseLogs.length > 0 ? promiseLogs[0] : null;

    return NextResponse.json({
      success: true,
      case_id: id,
      conversations: convData || [],
      promise_to_pay: promise
        ? {
            status: promise.metadata?.promise_status || "ACTIVE",
            promised_amount: promise.metadata?.promised_amount || null,
            promised_time: promise.metadata?.promised_time || null,
            created_at: promise.created_at,
          }
        : null,
    });
  } catch (err: any) {
    console.error("GET /api/recovery/[id]/chat error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
