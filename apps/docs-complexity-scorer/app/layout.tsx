import type { Metadata } from "next";
import { Inter, Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-serif" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Doc Complexity Scorer — Adrian Raposo",
  description:
    "Analyse documentation readability, jargon density, and complexity. Get Flesch-Kincaid scores, sentence-level highlights, and AI rewrite suggestions.",
  openGraph: {
    title: "Doc Complexity Scorer — Adrian Raposo",
    description: "Score your docs for readability, jargon, and complexity. AI-powered rewrites included.",
    url: "https://ai-tools-doc-complexity.vercel.app",
    siteName: "Adrian Raposo",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
