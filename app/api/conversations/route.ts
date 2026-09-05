import { NextRequest, NextResponse } from "next/server";
import { conversationService } from "@/src/services/conversation.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
      return NextResponse.json([]);
    }

    const data = await conversationService.getConversationsByCase(caseId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
