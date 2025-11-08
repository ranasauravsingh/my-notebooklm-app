// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parsePDF, chunkText } from "@/lib/utils/pdf-processor";
import {
	addDocumentToVectorStore,
	createPineconeIndex,
} from "@/lib/vector-store/pinecone";

// ✅ Keep the same config that worked
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 }
			);
		}

		if (file.type !== "application/pdf") {
			return NextResponse.json(
				{ error: "Only PDF files are allowed" },
				{ status: 400 }
			);
		}

		const maxSize = parseInt(
			process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760",
			10
		);
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: "File size exceeds 10MB" },
				{ status: 400 }
			);
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const documentId = `${Date.now()}-${Math.random()
			.toString(36)
			.substring(7)}`;

		const { text, pageCount } = await parsePDF(buffer);
		if (!text || text.trim().length === 0) {
			return NextResponse.json(
				{ error: "PDF appears to be empty or unreadable" },
				{ status: 400 }
			);
		}

		console.log("Chunking text...");
		const chunks = chunkText(text);
		console.log(`Created ${chunks.length} chunks`);

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "Failed to create text chunks from PDF" },
				{ status: 400 }
			);
		}

		console.log("Checking Pinecone index...");
		await createPineconeIndex();

		console.log("Adding to vector store...");
		await addDocumentToVectorStore(documentId, chunks);
		console.log("Upload complete!");

		const base64PDF = buffer.toString("base64");
		const dataUrl = `data:application/pdf;base64,${base64PDF}`;

		return NextResponse.json({
			id: documentId,
			name: file.name,
			url: dataUrl,
			pageCount,
			chunkCount: chunks.length,
			uploadedAt: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Upload error:", error);

		if (error?.code === "insufficient_quota") {
			return NextResponse.json(
				{
					error: "OpenAI API quota exceeded",
					details:
						"Please add credits to your OpenAI account or check your billing.",
				},
				{ status: 402 }
			);
		}

		if (error?.status === 401 || error?.code === "invalid_api_key") {
			return NextResponse.json(
				{
					error: "Invalid API key",
					details:
						"Please check your OpenAI API key in environment variables.",
				},
				{ status: 401 }
			);
		}

		if (error?.message?.includes("Pinecone")) {
			return NextResponse.json(
				{
					error: "Vector store error",
					details:
						"Failed to connect to Pinecone. Please check your API key and index configuration.",
				},
				{ status: 503 }
			);
		}

		if (
			error?.message?.includes("PDF") ||
			error?.message?.includes("parse")
		) {
			return NextResponse.json(
				{
					error: "PDF parsing failed",
					details:
						"The PDF file may be corrupted or password-protected.",
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error?.message || "Failed to process PDF" },
			{ status: 500 }
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Max-Age": "86400",
		},
	});
}
