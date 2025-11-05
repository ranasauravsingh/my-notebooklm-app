"use client";

import dynamic from "next/dynamic";
import { PDFUpload } from "@/components/upload/pdf-upload";
import { ChatInterface } from "@/components/chat/chat-interface";
import { useDocumentStore } from "@/store/document-store";
import { Toaster } from "react-hot-toast";

// ✅ ADDED: Dynamic import with ssr disabled to prevent server-side rendering
const PDFViewer = dynamic(
	() =>
		import("@/components/pdf-viewer/pdf-viewer").then((mod) => ({
			default: mod.PDFViewer,
		})),
	{
		ssr: false,
		loading: () => (
			<div className="h-full flex items-center justify-center">
				Loading PDF viewer...
			</div>
		),
	}
);

export default function Home() {
	const { currentDocument } = useDocumentStore();

	return (
		<main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
			<Toaster position="top-right" />

			<div className="max-w-7xl mx-auto">
				<header className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900">
						NotebookLM Clone
					</h1>
					<p className="text-gray-600 mt-1">
						Upload a PDF and chat with your document
					</p>
				</header>

				{!currentDocument ? (
					<div className="max-w-2xl mx-auto">
						<PDFUpload />
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
						<PDFViewer />
						<ChatInterface />
					</div>
				)}
			</div>
		</main>
	);
}
