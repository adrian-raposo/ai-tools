import { DocumentChunk, UploadedDoc } from "./types";

// Split text into overlapping chunks
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) chunks.push(chunk);
  }

  return chunks;
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

// Find top K most relevant chunks for a query embedding
export function findRelevantChunks(
  queryEmbedding: number[],
  chunks: DocumentChunk[],
  topK = 4
): DocumentChunk[] {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((r) => r.chunk);
}

// Process uploaded docs into embedded chunks using transformers.js
export async function processDocuments(docs: UploadedDoc[]): Promise<DocumentChunk[]> {
  // Dynamically import to avoid SSR issues
  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  const allChunks: DocumentChunk[] = [];

  for (const doc of docs) {
    const chunks = chunkText(doc.content);

    for (let i = 0; i < chunks.length; i++) {
      const output = await embedder(chunks[i], { pooling: "mean", normalize: true });
      const embedding = Array.from(output.data as Float32Array);

      allChunks.push({
        id: `${doc.name}-${i}`,
        text: chunks[i],
        embedding,
        source: doc.name,
      });
    }
  }

  return allChunks;
}
