export interface DocumentChunk {
  id: string;
  text: string;
  embedding: number[];
  source: string; // filename
}

export interface UploadedDoc {
  name: string;
  content: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}
