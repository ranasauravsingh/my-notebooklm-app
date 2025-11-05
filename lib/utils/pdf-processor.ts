// ✅ Use legacy build for Node.js
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ✅ CHANGED: Set workerSrc as a string path, not require()
if (typeof window === "undefined") {
	pdfjsLib.GlobalWorkerOptions.workerSrc =
		"pdfjs-dist/legacy/build/pdf.worker.mjs";
}

export async function parsePDF(buffer: Buffer): Promise<{
	text: string;
	pageCount: number;
}> {
	try {
		const loadingTask = pdfjsLib.getDocument({
			data: new Uint8Array(buffer),
		});

		const pdf = await loadingTask.promise;
		const pageCount = pdf.numPages;

		const textPromises = [];
		for (let i = 1; i <= pageCount; i++) {
			textPromises.push(
				pdf.getPage(i).then((page) => page.getTextContent())
			);
		}

		const textContents = await Promise.all(textPromises);

		const text = textContents
			.map((content) =>
				content.items.map((item: any) => item.str).join(" ")
			)
			.join("\n\n");

		return {
			text,
			pageCount,
		};
	} catch (error) {
		console.error("PDF parsing error:", error);
		throw new Error("Failed to parse PDF");
	}
}

export function chunkText(
	text: string,
	chunkSize: number = 1000,
	overlap: number = 200
): Array<{ text: string; pageNumber: number; chunkIndex: number }> {
	const chunks: Array<{
		text: string;
		pageNumber: number;
		chunkIndex: number;
	}> = [];

	const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

	let currentChunk = "";
	let currentPage = 1;
	let chunkIndex = 0;

	for (let i = 0; i < sentences.length; i++) {
		const sentence = sentences[i].trim();

		const pageMatch = sentence.match(/\bpage\s+(\d+)\b/i);
		if (pageMatch) {
			currentPage = parseInt(pageMatch[1]);
		}

		if (chunkIndex > 0 && chunkIndex % 3 === 0) {
			currentPage++;
		}

		if (
			(currentChunk + sentence).length > chunkSize &&
			currentChunk.length > 0
		) {
			chunks.push({
				text: currentChunk.trim(),
				pageNumber: currentPage,
				chunkIndex: chunkIndex++,
			});

			const words = currentChunk.split(" ");
			const overlapWords = Math.floor(overlap / 5);
			currentChunk =
				words.slice(-overlapWords).join(" ") + " " + sentence;
		} else {
			currentChunk += (currentChunk ? " " : "") + sentence;
		}
	}

	if (currentChunk.trim()) {
		chunks.push({
			text: currentChunk.trim(),
			pageNumber: currentPage,
			chunkIndex: chunkIndex++,
		});
	}

	return chunks;
}
