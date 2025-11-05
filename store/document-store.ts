import { create } from "zustand";
import { PDFDocument, Message } from "@/types";

interface DocumentStore {
	currentDocument: PDFDocument | null;
	messages: Message[];
	currentPage: number;
	setCurrentDocument: (doc: PDFDocument | null) => void;
	addMessage: (message: Message) => void;
	setCurrentPage: (page: number) => void;
	clearMessages: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
	currentDocument: null,
	messages: [],
	currentPage: 1,
	setCurrentDocument: (doc) => set({ currentDocument: doc }),
	addMessage: (message) =>
		set((state) => ({ messages: [...state.messages, message] })),
	setCurrentPage: (page) => set({ currentPage: page }),
	clearMessages: () => set({ messages: [] }),
}));
