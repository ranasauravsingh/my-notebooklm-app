import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {},

	webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals = [...(config.externals || []), "canvas"];
		}

		config.resolve.alias = {
			...config.resolve.alias,
			canvas: false,
			encoding: false,
		};

		// ✅ ADDED: Handle .mjs files for pdf.js worker
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
