import { NextRequest, NextResponse } from "next/server";
import { parsePDF, chunkText } from "@/lib/utils/pdf-processor";
import {
	addDocumentToVectorStore,
	createPineconeIndex,
} from "@/lib/vector-store/pinecone";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

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
			process.env.NEXT_PUBLIC_MAX_FILE_SIZE || "10485760"
		);
		if (file.size > maxSize) {
			return NextResponse.json(
				{ error: "File size exceeds 10MB" },
				{ status: 400 }
			);
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		const documentId = randomUUID();

		// ✅ ADDED: Create uploads directory if it doesn't exist
		const uploadsDir = join(process.cwd(), "public", "uploads");
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true });
		}

		const fileName = `${documentId}.pdf`;
		const filePath = join(uploadsDir, fileName);
		await writeFile(filePath, buffer);

		console.log("Parsing PDF...");
		const { text, pageCount } = await parsePDF(buffer);

		console.log("Chunking text...");
		const chunks = chunkText(text);
		console.log(`Created ${chunks.length} chunks`);

		console.log("Checking Pinecone index...");
		await createPineconeIndex();

		console.log("Adding to vector store...");
		await addDocumentToVectorStore(documentId, chunks);
		console.log("Upload complete!");

		return NextResponse.json({
			id: documentId,
			name: file.name,
			url: `/uploads/${fileName}`,
			pageCount,
			uploadedAt: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Upload error:", error);

		// ✅ ADDED: Better error messages based on error type
		if (error.code === "insufficient_quota") {
			return NextResponse.json(
				{
					error: "OpenAI API quota exceeded. Please add credits to your OpenAI account.",
				},
				{ status: 402 }
			);
		}

		if (error.status === 401) {
			return NextResponse.json(
				{
					error: "Invalid OpenAI API key. Please check your configuration.",
				},
				{ status: 401 }
			);
		}

		return NextResponse.json(
			{ error: error.message || "Failed to process PDF" },
			{ status: 500 }
		);
	}
}
