export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

export interface Citation {
  pageNumber: number;
  text: string;
}

export interface PDFDocument {
  id: string;
  name: string;
  url?: string;
  pageCount: number;
  chunkCount?: number;
  uploadedAt: string;
}

export interface ChatRequest {
  message: string;
  documentId: string;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
}
