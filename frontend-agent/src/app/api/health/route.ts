import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "UP",
    service: "frontend-agent",
    timestamp: new Date().toISOString(),
  });
}
