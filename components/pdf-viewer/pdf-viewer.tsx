"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	ZoomOut,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocumentStore } from "@/store/document-store";

// ✅ CHANGED: Use local worker from node_modules instead of CDN
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url
).toString();

export function PDFViewer() {
	const { currentDocument, currentPage, setCurrentPage } = useDocumentStore();
	const [numPages, setNumPages] = useState<number>(0);
	const [scale, setScale] = useState<number>(1.0);
	const [error, setError] = useState<string | null>(null);

	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		if (currentDocument) {
			setCurrentPage(1);
			setScale(1.0);
			setError(null);
			setIsLoading(true);
			console.log(
				"Loading PDF from:",
				currentDocument.url?.substring(0, 50) + "..."
			);
		}
	}, [currentDocument, setCurrentPage]);

	function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
		setNumPages(numPages);
		setError(null);
		setIsLoading(false);
		console.log("PDF loaded successfully, pages:", numPages);
	}

	function onDocumentLoadError(err: Error) {
		console.error("PDF load error:", err);
		setError(err.message);
		setIsLoading(false);
	}

	const goToPrevPage = () => {
		setCurrentPage(Math.max(1, currentPage - 1));
	};

	const goToNextPage = () => {
		setCurrentPage(Math.min(numPages, currentPage + 1));
	};

	const zoomIn = () => {
		setScale(Math.min(2.0, scale + 0.1));
	};

	const zoomOut = () => {
		setScale(Math.max(0.5, scale - 0.1));
	};

	if (!currentDocument) {
		return (
			<Card className="h-full flex items-center justify-center">
				<div className="text-center text-gray-500">
					<p className="text-lg">No document loaded</p>
					<p className="text-sm mt-2">Upload a PDF to get started</p>
				</div>
			</Card>
		);
	}

	if (!currentDocument.url) {
		return (
			<Card className="h-full flex items-center justify-center">
				<div className="text-center text-red-500">
					<p className="text-lg font-semibold">Error loading PDF</p>
					<p className="text-sm mt-2">No PDF URL provided</p>
					<p className="text-xs mt-2 text-gray-500">
						Please try uploading the file again
					</p>
				</div>
			</Card>
		);
	}

	return (
		<Card className="h-full flex flex-col">
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={goToPrevPage}
						disabled={currentPage <= 1 || isLoading}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm min-w-[100px] text-center">
						Page {currentPage} of{" "}
						{numPages || currentDocument.pageCount}
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={goToNextPage}
						disabled={currentPage >= numPages || isLoading}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={zoomOut}
						disabled={isLoading}
					>
						<ZoomOut className="h-4 w-4" />
					</Button>
					<span className="text-sm min-w-[60px] text-center">
						{Math.round(scale * 100)}%
					</span>
					<Button
						variant="outline"
						size="icon"
						onClick={zoomIn}
						disabled={isLoading}
					>
						<ZoomIn className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<ScrollArea className="flex-1 p-4">
				<div className="flex justify-center">
					<Document
						file={currentDocument.url}
						onLoadSuccess={onDocumentLoadSuccess}
						onLoadError={onDocumentLoadError}
						loading={
							<div className="flex items-center justify-center p-8">
								<div className="text-center">
									<Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
									<p>Loading PDF...</p>
								</div>
							</div>
						}
						error={
							<div className="flex flex-col items-center justify-center p-8 text-red-500">
								<p className="font-semibold">
									Failed to load PDF
								</p>
								{error && (
									<p className="text-sm mt-2">{error}</p>
								)}
								{/* ✅ IMPROVED: Show truncated URL for debugging */}
								<p className="text-xs mt-2 text-gray-500 max-w-md truncate">
									URL: {currentDocument.url?.substring(0, 80)}
									...
								</p>
								{/* ✅ ADDED: Helpful troubleshooting tips */}
								<div className="mt-4 text-xs text-gray-600 text-left">
									<p>Try these steps:</p>
									<ul className="list-disc ml-5 mt-1">
										<li>Upload a different PDF file</li>
										<li>
											Check if the PDF is
											password-protected
										</li>
										<li>
											Ensure the file is not corrupted
										</li>
									</ul>
								</div>
							</div>
						}
					>
						<Page
							pageNumber={currentPage}
							scale={scale}
							renderTextLayer={false}
							renderAnnotationLayer={false}
							loading={
								<div className="flex items-center justify-center p-4">
									<p className="text-sm text-gray-500">
										Loading page...
									</p>
								</div>
							}
						/>
					</Document>
				</div>
			</ScrollArea>
		</Card>
	);
}
