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
        const { pipeline } = await import("@xenova/transformers");
        const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
        const output = await embedder(question, { pooling: "mean", normalize: true });
        const queryEmbedding = Array.from(output.data as Float32Array);

        const relevant = findRelevantChunks(queryEmbedding, chunks);
        const sources = [...new Set(relevant.map((c) => c.source))];

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
    <main className="min-h-screen bg-[#fafaf8] px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        {/* Back nav */}
        <div>
          <a
            href="https://adrian-raposo.vercel.app/#sa-tools"
            className="inline-flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors font-mono tracking-widest uppercase"
          >
            ← All Tools
          </a>
          <p className="text-xs text-stone-400 font-mono tracking-widest uppercase mt-1">
            AI Tools · Adrian Raposo
          </p>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight">
            Ask My <span className="font-normal italic text-[#4a7c6f]">Docs</span>
          </h1>
          <p className="mt-3 text-stone-500 text-base leading-relaxed max-w-lg">
            Upload your documentation and ask questions in plain language —
            answers come straight from your content, with sources always cited.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
            Documents
          </p>
          <FileUpload onDocsLoaded={handleDocsLoaded} isProcessing={isProcessing} />
        </div>

        {/* Chat card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">
            Ask a question
          </p>
          <ChatInterface
            messages={messages}
            onSend={handleQuestion}
            isLoading={isLoading}
            isReady={chunks.length > 0 && !isProcessing}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-300 font-mono tracking-wide">
          Embeddings run in your browser · Answers powered by Groq · Built by Adrian Raposo
        </p>

      </div>
    </main>
  );
}
