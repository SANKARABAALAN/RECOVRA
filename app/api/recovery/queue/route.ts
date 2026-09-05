import { NextResponse } from "next/server";
import { queueService } from "@/src/services/queue.service";
import { logger } from "@/src/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await queueService.getQueuedJobs();
    return NextResponse.json({ success: true, count: jobs.length, jobs });
  } catch (err: any) {
    logger.error("Error retrieving recovery queue", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
