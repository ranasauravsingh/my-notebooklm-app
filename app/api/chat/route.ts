import { NextRequest, NextResponse } from "next/server";
import { searchVectorStore } from "@/lib/vector-store/pinecone";
import { generateFromHuggingFace } from "@/lib/utils/hf-client";
import { handleApiError } from "@/lib/utils/handleApiError";

export async function POST(request: NextRequest) {
	try {
		const { message, documentId } = await request.json();

		if (!message || !documentId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		console.log("🔍 Searching vector store for:", message);

		// Search vector store for relevant chunks
		const relevantDocs = await searchVectorStore(documentId, message, 4);

		if (relevantDocs.length === 0) {
			return NextResponse.json({
				message:
					"I couldn't find relevant information in the document to answer your question.",
				citations: [],
			});
		}

		console.log(`✅ Found ${relevantDocs.length} relevant documents`);

		// ✅ CHANGED: Use 'text' instead of 'doc.pageContent'
		// ✅ CHANGED: Use 'pageNumber' directly instead of 'doc.metadata.pageNumber'
		const context = relevantDocs
			.map(
				(doc, idx) =>
					`[${idx + 1}] (Page ${doc.pageNumber}): ${doc.text}`
			)
			.join("\n\n");

		const prompt = `You are a helpful assistant that answers questions based on provided document context.

Context from document:
${context}

Question: ${message}

Instructions:
- Answer based only on the provided context
- Cite page numbers when referencing information
- Be concise and accurate`;

console.log("🤖 Generating response...");

		let assistantText: string;
		try {
			assistantText = await generateFromHuggingFace(prompt, {
				model: process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
				max_new_tokens: 300,
				temperature: 0.3,
				wait_for_model: true,
			});
		} catch (hfError: any) {
			console.error("❌ HF Generation Error:", hfError);

			if (hfError.status === 400) {
				return NextResponse.json(
					{
						error: "Model not supported",
						details: hfError.message || 
							"The configured model is not available through Inference Providers. Please update HF_MODEL in your .env.local to a supported model like 'meta-llama/Llama-3.1-8B-Instruct'",
					},
					{ status: 400 }
				);
			}

			// ✅ IMPROVED: Specific error messages for different scenarios
			if (hfError.status === 503) {
				return NextResponse.json(
					{
						error: "The AI model is currently loading",
						details: "Please wait 30-60 seconds and try again. The model needs time to initialize.",
					},
					{ status: 503 }
				);
			}

			if (hfError.status === 404) {
				return NextResponse.json(
					{
						error: "Model not available",
						details: "The requested model is not available through Inference Providers. Please check your HF_MODEL configuration.",
					},
					{ status: 404 }
				);
			}

			throw hfError; // Re-throw to outer catch
		}

		const responseText = assistantText
			.replace(/<\|.*?\|>/g, "") // Remove special tokens
			.replace(/^(Answer|Response):\s*/i, "") // Remove common prefixes
			.trim();


		const citations = relevantDocs.map((doc) => ({
			pageNumber: doc.pageNumber,
			text: doc.text.substring(0, 150) + "...",
		}));

		const uniqueCitations = Array.from(
			new Map(citations.map((c) => [c.pageNumber, c])).values()
		);


		return NextResponse.json({
			message: responseText,
			citations: uniqueCitations,
		});
	} catch (error) {
		console.error("❌ Chat API Error:", error);

		// ✅ IMPROVED: Comprehensive error response
		return NextResponse.json(
			{
				error: error.message || "Failed to process chat message",
				details:
					error.status === 503
						? "The AI model is currently loading. This usually takes 30-60 seconds. Please try again shortly."
						: error.status === 404
						? "The configured model is not available. Please contact support."
						: "An unexpected error occurred. Please try again or contact support if the issue persists.",
			},
			{ status: error.status || 500 }
		);

	}
}
