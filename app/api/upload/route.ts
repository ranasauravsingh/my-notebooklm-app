// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parsePDF, chunkText } from "@/lib/utils/pdf-processor";
import {
	addDocumentToVectorStore,
	createPineconeIndex,
} from "@/lib/vector-store/pinecone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	// ✅ Test with imports but minimal logic
	return NextResponse.json({
		message: "Route with imports works!",
		test: true,
	});
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
		},
	});
}
