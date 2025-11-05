// lib/hf-client.ts
// CHANGED: New helper to call Hugging Face Inference API instead of OpenAI SDK.

export type HFGenerateOptions = {
	model?: string; // e.g. "gpt2", "bigscience/bloom", or any HF hosted model
	max_new_tokens?: number;
	temperature?: number;
	wait_for_model?: boolean;
};

export async function generateFromHuggingFace(
	prompt: string,
	opts: HFGenerateOptions = {}
): Promise<string> {
	const model = opts.model || process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct"; // CHANGED: default model (override via HF_MODEL env var)
	// const url = `https://router.huggingface.co/hf-inference/api/v1/models/${model}`;
	const url = `https://router.huggingface.co/v1/chat/completions`;

	const hfApiKey = process.env.HUGGINGFACE_API_KEY;
	if (!hfApiKey) throw new Error("Missing HUGGINGFACE_API_KEY env var");

	// CHANGED: HF inference expects { inputs, parameters, options }
	const body = {
		model: model,
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],
		max_tokens: opts.max_new_tokens ?? 500,
		temperature: opts.temperature ?? 0.3,
		// ✅ ADDED: Additional parameters for quality
		top_p: 0.95,
		// ✅ REMOVED: frequency_penalty not supported by all providers
		stream: false,
	};

	console.log("🔍 Hugging Face inference call:", url);
	console.log("📦 Model:", model);

	const res = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${hfApiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	// CHANGED: Better error handling surface
	if (!res.ok) {
		const text = await res.text();
		console.error("❌ HF API Error:", text);

		if (res.status === 400) {
			// ✅ ADDED: Better error message for unsupported models
			if (text.includes("model_not_supported") || text.includes("not supported")) {
				const err = new Error(
					`Model "${model}" is not supported by Inference Providers. ` +
					`Please use a supported model like "meta-llama/Llama-3.1-8B-Instruct". ` +
					`Check https://huggingface.co/inference/models for the full list.`
				);
				(err as any).status = 400;
				throw err;
			}
		}

		// ✅ ADDED: Handle specific error codes
		if (res.status === 503) {
			const err = new Error("Model is currently loading. Please wait 30-60 seconds and try again.");
			(err as any).status = 503;
			throw err;
		}

		if (res.status === 404) {
			const err = new Error(`Model not found or not available: ${model}`);
			(err as any).status = 404;
			throw err;
		}

		const err = new Error(
			`Hugging Face API error: ${res.status} ${res.statusText} — ${text}`
		);
		(err as any).status = res.status;
		throw err;

	}

	const data = await res.json();
	console.log("✅ HF API Response received");

	// CHANGED: HF responses vary by model — common shapes:
	// 1) { generated_text: "..." } OR
	// 2) [{generated_text:"..."}] OR
	// 3) For conversational models, some return {generated_text} or arrays.
	// Normalize to string:
	if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
		const firstChoice = data.choices[0];
		if (firstChoice.message && typeof firstChoice.message.content === "string") {
			return firstChoice.message.content.trim();
		}
	}

	// ✅ ADDED: Handle error responses
	if (data.error) {
		throw new Error(`HF Model Error: ${JSON.stringify(data.error)}`);
	}

	throw new Error(`Unexpected response format from HF API: ${JSON.stringify(data)}`);
}
