import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { caseId: string } }
) {
  try {
    const { caseId } = params;
    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId parameter" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("recovery_case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    // Unpack serialized intent and sentiment from the detected_intent field
    const mapped = (data || []).map((msg) => {
      let intent = msg.detected_intent || "UNKNOWN";
      let sentiment = "Neutral";

      if (msg.detected_intent && msg.detected_intent.startsWith("{")) {
        try {
          const parsed = JSON.parse(msg.detected_intent);
          intent = parsed.intent || "UNKNOWN";
          sentiment = parsed.sentiment || "Neutral";
        } catch (e) {
          // Fallback if serialization failed
        }
      }

      return {
        id: msg.id,
        role: msg.role,
        message: msg.message,
        intent,
        sentiment,
        confidence: msg.confidence_score ? Number(msg.confidence_score) : 90,
        timestamp: msg.created_at,
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error("GET Negotiator History error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch conversation history" },
      { status: 500 }
    );
  }
}
