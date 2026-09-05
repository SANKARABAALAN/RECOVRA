import { NextRequest, NextResponse } from "next/server";
import { exceptionService } from "@/src/services/exception.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolvedFilter = searchParams.get("resolved");
    const severityFilter = searchParams.get("severity");

    let exceptions = await exceptionService.getExceptions();

    if (resolvedFilter !== null && resolvedFilter !== undefined) {
      const isResolved = resolvedFilter.toLowerCase() === "true";
      exceptions = exceptions.filter((e) => e.resolved === isResolved);
    }

    if (severityFilter) {
      exceptions = exceptions.filter((e) => e.severity === severityFilter.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      count: exceptions.length,
      exceptions,
    });
  } catch (err: any) {
    console.error("GET /api/exceptions error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch exceptions" },
      { status: 500 }
    );
  }
}
