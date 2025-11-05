"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDocumentStore } from "@/store/document-store";
import { Message } from "@/types";
import toast from "react-hot-toast";
import axios, { AxiosError } from "axios";
import ReactMarkdown from "react-markdown";

export function ChatInterface() {
	const { currentDocument, messages, addMessage, setCurrentPage } =
		useDocumentStore();
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	// ✅ Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	// ✅ Send message to API
	const handleSend = async () => {
		if (!input.trim() || !currentDocument || isLoading) return;

		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input,
			timestamp: new Date(),
		};

		addMessage(userMessage);
		setInput("");
		setIsLoading(true);

		try {
			const response = await axios.post("/api/chat", {
				message: input,
				documentId: currentDocument.id,
			});

			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: response.data.message,
				citations: response.data.citations,
				timestamp: new Date(),
			};

			addMessage(assistantMessage);
		} catch (error: unknown) {
			console.error("Chat error:", error);

			// Safely extract message from Axios-style or generic error
			let message = "Failed to get response";

			if (error instanceof AxiosError && error.response?.data?.error) {
				message = error.response.data.error;
			} else if (error instanceof Error) {
				message = error.message;
			}

			toast.error(message);

			const errorMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: "Sorry, I encountered an error. Please try again.",
				timestamp: new Date(),
			};

			addMessage(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	// ✅ Handle Enter key (without Shift)
	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// ✅ Navigate to cited page
	const handleCitationClick = (pageNumber: number) => {
		setCurrentPage(pageNumber);
		toast.success(`Navigated to page ${pageNumber}`);
	};

	// ✅ Show placeholder if no document
	if (!currentDocument) {
		return (
			<Card className="h-full flex items-center justify-center">
				<div className="text-center text-gray-500">
					<p className="text-lg">No document loaded</p>
					<p className="text-sm mt-2">
						Upload a PDF to start chatting
					</p>
				</div>
			</Card>
		);
	}

	return (
		<Card className="h-full flex flex-col">
			{/* ✅ Header */}
			<div className="p-4 border-b">
				<h2 className="font-semibold">Chat with Document</h2>
				<p className="text-sm text-gray-500 truncate">
					{currentDocument.name}
				</p>
			</div>

			{/* ✅ Messages Area */}
			<ScrollArea className="flex-1 p-4" ref={scrollRef}>
				<div className="space-y-4">
					{messages.length === 0 && (
						<div className="text-center text-gray-500 py-8">
							<p>Ask me anything about this document!</p>
						</div>
					)}

					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex gap-3 ${
								message.role === "user"
									? "justify-end"
									: "justify-start"
							}`}
						>
							{/* ✅ Show avatar for assistant */}
							{message.role === "assistant" && (
								<Avatar className="h-8 w-8">
									<AvatarFallback>AI</AvatarFallback>
								</Avatar>
							)}

							<div
								className={`max-w-[80%] rounded-lg p-3 ${
									message.role === "user"
										? "bg-primary text-primary-foreground"
										: "bg-muted"
								}`}
							>
								{/* ✅ Message content with markdown support */}
								<div className="prose prose-sm max-w-none dark:prose-invert">
									<ReactMarkdown>
										{message.content}
									</ReactMarkdown>
								</div>

								{/* ✅ Citations (clickable badges) */}
								{message.citations &&
									message.citations.length > 0 && (
										<div className="mt-3 flex flex-wrap gap-2">
											{message.citations.map(
												(citation, idx) => (
													<Badge
														key={idx}
														variant="secondary"
														className="cursor-pointer hover:bg-secondary/80"
														onClick={() =>
															handleCitationClick(
																citation.pageNumber
															)
														}
													>
														Page{" "}
														{citation.pageNumber}
													</Badge>
												)
											)}
										</div>
									)}
							</div>

							{/* ✅ Show avatar for user */}
							{message.role === "user" && (
								<Avatar className="h-8 w-8">
									<AvatarFallback>You</AvatarFallback>
								</Avatar>
							)}
						</div>
					))}

					{/* ✅ Loading indicator */}
					{isLoading && (
						<div className="flex gap-3">
							<Avatar className="h-8 w-8">
								<AvatarFallback>AI</AvatarFallback>
							</Avatar>
							<div className="bg-muted rounded-lg p-3">
								<Loader2 className="h-4 w-4 animate-spin" />
							</div>
						</div>
					)}
				</div>
			</ScrollArea>

			{/* ✅ Input Area */}
			<div className="p-4 border-t">
				<div className="flex gap-2">
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyUp={handleKeyPress}
						placeholder="Ask a question about the document..."
						className="min-h-[60px] resize-none"
						disabled={isLoading}
					/>
					<Button
						onClick={handleSend}
						disabled={!input.trim() || isLoading}
						size="icon"
						className="h-[60px] w-[60px]"
					>
						{isLoading ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<Send className="h-5 w-5" />
						)}
					</Button>
				</div>
			</div>
		</Card>
	);
}
