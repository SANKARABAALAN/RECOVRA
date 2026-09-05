import { NextRequest, NextResponse } from "next/server";
import { recoveryService } from "@/src/services/recovery.service";
import { policyService } from "@/src/services/policy.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recovery_case_id, decision } = body;

    if (!recovery_case_id || !decision) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: recovery_case_id, decision" },
        { status: 400 }
      );
    }

    // 1. Fetch case details
    const caseDetails = await recoveryService.getRecoveryCaseById(recovery_case_id);
    if (!caseDetails) {
      return NextResponse.json(
        { success: false, error: `Recovery case not found: ${recovery_case_id}` },
        { status: 404 }
      );
    }

    // 2. Fetch retry history from audits
    const retryHistory = (caseDetails.audits || []).filter(
      (a: any) => a.event_type === "Retry executed"
    );

    // 3. Run Policy Check using Policy Service
    const policyResult = await policyService.checkPolicy(caseDetails, decision, retryHistory);

    return NextResponse.json({ success: true, policy_check: policyResult });
  } catch (err: any) {
    console.error("Policy check API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute policy validation check" },
      { status: 500 }
    );
  }
}
