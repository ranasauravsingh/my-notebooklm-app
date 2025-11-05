import { NextResponse } from "next/server";

export function handleApiError(
	error: unknown,
	fallback = "Internal Server Error"
) {
	console.error(error);

	let message = fallback;

	if (error instanceof Error) message = error.message;
	else if (typeof error === "string") message = error;
	else if (typeof error === "object" && error && "message" in error)
		message = String((error as { message?: unknown }).message);

	return NextResponse.json({ error: message }, { status: 500 });
}
