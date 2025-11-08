import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {},
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
	},
	async headers() {
		return [
			{
				// ✅ CHANGED: More specific matcher for API routes
				source: "/api/:path*",
				headers: [
					{ key: "Access-Control-Allow-Credentials", value: "true" },
					{ key: "Access-Control-Allow-Origin", value: "*" },
					{
						key: "Access-Control-Allow-Methods",
						value: "GET,DELETE,PATCH,POST,PUT,OPTIONS", // ✅ Added OPTIONS
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
					},
				],
			},
		];
	},

	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals = [...(config.externals || []), "canvas"];
		}

		config.resolve.alias = {
			...config.resolve.alias,
			canvas: false,
			encoding: false,
		};

		config.module.rules.push({
			test: /\.mjs$/,
			include: /node_modules/,
			type: "javascript/auto",
		});

		return config;
	},

	reactCompiler: true,
};

export default nextConfig;
