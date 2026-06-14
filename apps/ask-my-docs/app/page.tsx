"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import { DocumentChunk, UploadedDoc, ChatMessage } from "@/lib/types";
import { processDocuments, findRelevantChunks } from "@/lib/embeddings";

export default function Home() {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDocsLoaded = useCallback(async (docs: UploadedDoc[]) => {
    setIsProcessing(true);
    setChunks([]);
    setMessages([]);
    try {
      const processed = await processDocuments(docs);
      setChunks(processed);
    } catch (err) {
      console.error("Failed to process documents:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleQuestion = useCallback(
    async (question: string) => {
      if (!chunks.length) return;

      const userMessage: ChatMessage = { role: "user", content: question };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Get query embedding
        const { pipeline } = await import("@xenova/transformers");
        const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        const output = await embedder(question, { pooling: "mean", normalize: true });
        const queryEmbedding = Array.from(output.data as Float32Array);

        // Find relevant chunks
        const relevant = findRelevantChunks(queryEmbedding, chunks);
        const sources = [...new Set(relevant.map((c) => c.source))];

        // Call API
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, chunks: relevant }),
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.answer || data.error || "Something went wrong.",
            sources,
          },
        ]);
      } catch (err) {
        console.error("Question error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, something went wrong. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [chunks]
  );

  return (
    <main className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-stone-800 tracking-tight">
            Ask My Docs
          </h1>
          <p className="mt-2 text-stone-400 text-sm">
            Upload your documentation and ask questions — answers come straight from your content.
          </p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
            Documents
          </h2>
          <FileUpload onDocsLoaded={handleDocsLoaded} isProcessing={isProcessing} />
        </div>

        {/* Chat */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
            Ask a question
          </h2>
          <ChatInterface
            messages={messages}
            onSend={handleQuestion}
            isLoading={isLoading}
            isReady={chunks.length > 0 && !isProcessing}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-300">
          Embeddings run in your browser · Answers powered by Groq
        </p>

      </div>
    </main>
  );
}
