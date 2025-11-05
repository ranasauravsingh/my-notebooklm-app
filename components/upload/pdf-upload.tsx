"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDocumentStore } from "@/store/document-store";
import toast from "react-hot-toast";
import axios from "axios";
import { AxiosError } from "axios";

export function PDFUpload() {
	const [uploading, setUploading] = useState(false);
	const { setCurrentDocument, clearMessages } = useDocumentStore();

	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			const file = acceptedFiles[0];
			if (!file) return;

			setUploading(true);
			const formData = new FormData();
			formData.append("file", file);

			try {
				const response = await axios.post("/api/upload", formData, {
					headers: { "Content-Type": "multipart/form-data" },
				});

				setCurrentDocument(response.data);
				clearMessages();
				toast.success("PDF uploaded successfully!");
			} catch (error: unknown) {
				const err = error as AxiosError<{ error?: string }>;
				toast.error(
					err.response?.data?.error || "Failed to upload PDF"
				);
			} finally {
				setUploading(false);
			}
		},
		[setCurrentDocument, clearMessages]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "application/pdf": [".pdf"] },
		maxFiles: 1,
		maxSize: 10485760, // 10MB
	});

	return (
		<Card className="p-8">
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${
				isDragActive
					? "border-primary bg-primary/5"
					: "border-gray-300 hover:border-primary"
			}
          ${uploading ? "pointer-events-none opacity-50" : ""}`}
			>
				<input {...getInputProps()} />

				<div className="flex flex-col items-center gap-4">
					{uploading ? (
						<Loader2 className="w-12 h-12 animate-spin text-primary" />
					) : (
						<Upload className="w-12 h-12 text-gray-400" />
					)}

					<div>
						<p className="text-lg font-semibold mb-2">
							{uploading
								? "Processing PDF..."
								: "Upload your PDF document"}
						</p>
						<p className="text-sm text-gray-500">
							Drag and drop or click to browse (Max 10MB)
						</p>
					</div>

					{!uploading && (
						<Button type="button" variant="outline">
							<FileText className="w-4 h-4 mr-2" />
							Select PDF
						</Button>
					)}
				</div>
			</div>
		</Card>
	);
}
