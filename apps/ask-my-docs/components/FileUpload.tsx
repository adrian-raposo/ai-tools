"use client";

import { useCallback, useState } from "react";
import { UploadedDoc } from "@/lib/types";

interface FileUploadProps {
  onDocsLoaded: (docs: UploadedDoc[]) => void;
  isProcessing: boolean;
}

export default function FileUpload({ onDocsLoaded, isProcessing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);

  const readFiles = useCallback(
    async (files: FileList) => {
      const docs: UploadedDoc[] = [];

      for (const file of Array.from(files)) {
        if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) continue;
        const content = await file.text();
        docs.push({ name: file.name, content });
      }

      if (docs.length > 0) {
        setLoadedFiles(docs.map((d) => d.name));
        onDocsLoaded(docs);
      }
    },
    [onDocsLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      readFiles(e.dataTransfer.files);
    },
    [readFiles]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
          ${isDragging ? "border-violet-300 bg-violet-50" : "border-stone-200 bg-stone-50 hover:border-violet-200 hover:bg-violet-50/40"}
        `}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept=".md,.txt"
          className="hidden"
          onChange={(e) => e.target.files && readFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-2xl">
            📄
          </div>
          <div>
            <p className="text-stone-700 font-medium">Drop your docs here</p>
            <p className="text-stone-400 text-sm mt-1">Supports .md and .txt files</p>
          </div>
        </div>
      </div>

      {loadedFiles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {loadedFiles.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full border border-emerald-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              {name}
            </span>
          ))}
        </div>
      )}

      {isProcessing && (
        <p className="mt-4 text-sm text-violet-500 animate-pulse text-center">
          Processing documents and generating embeddings…
        </p>
      )}
    </div>
  );
}
