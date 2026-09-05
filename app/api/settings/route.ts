import { NextRequest, NextResponse } from "next/server";
import { verifyAuthHeader } from "@/src/lib/security";

export const dynamic = "force-dynamic";

// Persistent merchant settings store
let currentSettings = {
  merchantName: "Acme Merchant Inc.",
  operatorName: "Acme Operator",
  operatorEmail: "operator@acme.sys",
  role: "Master Recovery Administrator",
  maxRetries: 4,
  amountThreshold: 500000,
  confidenceThreshold: 80,
  cooldownMinutes: 5,
  alertsEmail: "alerts@acmeretail.com",
  slackWebhook: "https://hooks.slack.com/services/T00/B00/X00",
  environment: "sandbox",
  demoMode: true,
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    return NextResponse.json({ success: true, settings: currentSettings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthHeader(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    currentSettings = {
      ...currentSettings,
      ...body,
    };

    return NextResponse.json({
      success: true,
      message: "Merchant configuration saved successfully",
      settings: currentSettings,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
