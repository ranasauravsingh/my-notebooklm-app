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
	try {
		// ✅ Step 1: Test formData parsing
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 }
			);
		}

		// ✅ Step 2: Validate file
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

		// ✅ Step 3: Get buffer
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const documentId = `${Date.now()}-${Math.random()
			.toString(36)
			.substring(7)}`;

		// ✅ Step 4: Parse PDF (THIS MIGHT FAIL)
		console.log("Starting PDF parse...");
		const { text, pageCount } = await parsePDF(buffer);
		console.log("PDF parsed successfully");

		if (!text || text.trim().length === 0) {
			return NextResponse.json(
				{ error: "PDF appears to be empty or unreadable" },
				{ status: 400 }
			);
		}

		// ✅ Step 5: Chunk text
		console.log("Chunking text...");
		const chunks = chunkText(text);
		console.log(`Created ${chunks.length} chunks`);

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "Failed to create text chunks from PDF" },
				{ status: 400 }
			);
		}

		// ✅ Step 6: Vector store operations (THIS MIGHT TIMEOUT)
		console.log("Checking Pinecone index...");
		await createPineconeIndex();

		console.log("Adding to vector store...");
		await addDocumentToVectorStore(documentId, chunks);
		console.log("Upload complete!");

		// ✅ Step 7: Return response
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
		// ✅ Enhanced error logging
		console.error("Upload error details:", {
			message: error?.message,
			code: error?.code,
			status: error?.status,
			stack: error?.stack,
		});

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

		// ✅ Return actual error for debugging
		return NextResponse.json(
			{
				error: error?.message || "Failed to process PDF",
				details: error?.stack || "No stack trace available",
			},
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
		},
	});
}
