// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ✅ ADDED: Middleware to ensure API routes work correctly on Vercel
export function middleware(request: NextRequest) {
	// ✅ Log all API requests for debugging
	if (request.nextUrl.pathname.startsWith("/api/")) {
		console.log("🔍 Middleware - API Request:", {
			method: request.method,
			path: request.nextUrl.pathname,
			url: request.url,
		});
	}

	// ✅ Handle CORS for API routes
	if (request.nextUrl.pathname.startsWith("/api/")) {
		// Handle preflight requests
		if (request.method === "OPTIONS") {
			return new NextResponse(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods":
						"GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, Authorization",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		// ✅ Add CORS headers to all API responses
		const response = NextResponse.next();
		response.headers.set("Access-Control-Allow-Origin", "*");
		response.headers.set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS"
		);
		response.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization"
		);
		return response;
	}

	return NextResponse.next();
}

// ✅ CRITICAL: Configure which paths the middleware should run on
export const config = {
	matcher: [
		"/api/:path*", // Match all API routes
	],
};
