"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/lib/types";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSend: (question: string) => void;
  isLoading: boolean;
  isReady: boolean;
}

export default function ChatInterface({ messages, onSend, isLoading, isReady }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading || !isReady) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center text-stone-400 text-sm py-10">
            {isReady ? "Ask a question about your docs" : "Upload docs above to get started"}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === "user"
                  ? "bg-violet-100 text-violet-900 rounded-br-sm"
                  : "bg-white border border-stone-100 text-stone-700 rounded-bl-sm shadow-sm"
                }
              `}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div className="prose prose-sm prose-stone max-w-none
                  prose-a:text-violet-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-stone-800 prose-code:text-violet-700
                  prose-code:bg-violet-50 prose-code:px-1 prose-code:rounded
                  prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                  {msg.sources.map((src) => (
                    <span key={src} className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-100">
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          placeholder={isReady ? "Ask a question…" : "Upload docs first"}
          disabled={!isReady || isLoading}
          rows={1}
          className="flex-1 resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
        />
        <button
          onClick={handleSubmit}
          disabled={!isReady || isLoading || !input.trim()}
          className="px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
