// app/api/upload/route.ts
import { NextResponse } from "next/server";

// ✅ Minimal configuration for testing
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
	return NextResponse.json({
		status: "ok",
		message: "Upload endpoint is alive",
		timestamp: new Date().toISOString(),
	});
}

export async function POST() {
	return NextResponse.json({
		error: "Test mode - actual upload disabled",
		message: "If you see this, the route is working!",
	});
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
	});
}
