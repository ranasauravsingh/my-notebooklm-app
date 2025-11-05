import { Pinecone } from "@pinecone-database/pinecone";
import { HfInference } from "@huggingface/inference";

let pineconeClient: Pinecone | null = null;
let hfClient: HfInference | null = null;

export async function getPineconeClient() {
	if (!pineconeClient) {
		pineconeClient = new Pinecone({
			apiKey: process.env.PINECONE_API_KEY!,
		});
	}
	return pineconeClient;
}

// ✅ NEW: Hugging Face client for FREE embeddings
function getHFClient() {
	if (!hfClient) {
		hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY!);
	}
	return hfClient;
}

export async function createPineconeIndex() {
	const client = await getPineconeClient();
	const indexName = process.env.PINECONE_INDEX_NAME!;

	try {
		const indexList = await client.listIndexes();
		const indexExists = indexList.indexes?.some(
			(index) => index.name === indexName
		);

		if (!indexExists) {
			await client.createIndex({
				name: indexName,
				dimension: 384, // ✅ CHANGED: 384 for sentence-transformers model (was 1536 for OpenAI)
				metric: "cosine",
				spec: {
					serverless: {
						cloud: "aws",
						region: "us-east-1",
					},
				},
			});

			console.log("Waiting for index to be ready...");
			await new Promise((resolve) => setTimeout(resolve, 60000));
		}
	} catch (error) {
		console.error("Error creating index:", error);
	}
}

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error: any) {
			if (i === maxRetries - 1 || error.code === "insufficient_quota") {
				throw error;
			}
			console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
			delay *= 2;
		}
	}
	throw new Error("Max retries reached");
}

// ✅ CHANGED: Use FREE Hugging Face embeddings instead of OpenAI
export async function getEmbedding(text: string): Promise<number[]> {
	const hf = getHFClient();

	return retryWithBackoff(async () => {
		// ✅ Using FREE sentence-transformers model
		const response = await hf.featureExtraction({
			model: "sentence-transformers/all-MiniLM-L6-v2",
			inputs: text,
		});

		// Handle both single array and array-of-arrays
		if (Array.isArray(response)) {
			if (response.length > 0 && Array.isArray(response[0])) {
				// Case: number[][] → take first array
				return response[0] as number[];
			} else {
				// Case: number[] → return as-is
				return response as number[];
			}
		}

		// Fallback: should not happen for string input
		throw new Error("Unexpected embedding format from Hugging Face");
	});
}

export async function addDocumentToVectorStore(
	documentId: string,
	chunks: Array<{ text: string; pageNumber: number; chunkIndex: number }>
) {
	const client = await getPineconeClient();
	const indexName = process.env.PINECONE_INDEX_NAME!;
	const index = client.Index(indexName);

	const embeddingBatchSize = 10;
	const vectors = [];

	for (let i = 0; i < chunks.length; i += embeddingBatchSize) {
		const batch = chunks.slice(i, i + embeddingBatchSize);
		console.log(
			`Processing embeddings ${i + 1}-${Math.min(
				i + embeddingBatchSize,
				chunks.length
			)} of ${chunks.length}...`
		);

		const batchVectors = await Promise.all(
			batch.map(async (chunk) => {
				const embedding = await getEmbedding(chunk.text);

				return {
					id: `${documentId}_chunk_${chunk.chunkIndex}`,
					values: embedding,
					metadata: {
						documentId,
						text: chunk.text,
						pageNumber: chunk.pageNumber,
						chunkIndex: chunk.chunkIndex,
					},
				};
			})
		);

		vectors.push(...batchVectors);

		if (i + embeddingBatchSize < chunks.length) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	const upsertBatchSize = 100;
	for (let i = 0; i < vectors.length; i += upsertBatchSize) {
		const batch = vectors.slice(i, i + upsertBatchSize);
		console.log(
			`Upserting vectors ${i + 1}-${Math.min(
				i + upsertBatchSize,
				vectors.length
			)} to Pinecone...`
		);
		await index.namespace(documentId).upsert(batch);
	}
}

export async function searchVectorStore(
	documentId: string,
	query: string,
	topK: number = 4
) {
	const client = await getPineconeClient();
	const indexName = process.env.PINECONE_INDEX_NAME!;
	const index = client.Index(indexName);

	const queryEmbedding = await getEmbedding(query);

	const queryResponse = await index.namespace(documentId).query({
		vector: queryEmbedding,
		topK,
		includeMetadata: true,
	});

	return (
		queryResponse.matches?.map((match) => ({
			text: match.metadata?.text as string,
			pageNumber: match.metadata?.pageNumber as number,
			score: match.score,
		})) || []
	);
}

export async function deleteDocumentFromVectorStore(documentId: string) {
	const client = await getPineconeClient();
	const indexName = process.env.PINECONE_INDEX_NAME!;
	const index = client.Index(indexName);

	try {
		await index.namespace(documentId).deleteAll();
	} catch (error) {
		console.error("Error deleting document from vector store:", error);
	}
}
