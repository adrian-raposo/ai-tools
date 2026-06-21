"use client";

import { useState, useRef, useCallback } from "react";

type Audience = "general" | "technical" | "mixed";
type Severity = "low" | "medium" | "high";
type CognitiveLoad = "Low" | "Medium" | "High" | "Very High";

interface Metrics {
  avgSentenceLength: number;
  passiveVoicePercent: number;
  jargonDensity: number;
  secondPersonPercent: number;
}

interface Violation {
  sentence: string;
  rule: string;
  detail: string;
  severity: Severity;
}

interface Suggestion {
  original: string;
  rewrite: string;
  rule: string;
  type: "passive" | "jargon" | "length" | "person" | "clarity";
}

interface AnalysisResult {
  mstpScore: number;
  grade: "Excellent" | "Good" | "Needs Work" | "Poor";
  cognitiveLoad: CognitiveLoad;
  cognitiveLoadReason: string;
  metrics: Metrics;
  violations: Violation[];
  jargonTerms: string[];
  suggestions: Suggestion[];
  summary: string;
}

function scoreColor(score: number): string {
  if (score >= 85) return "#4a7c6f";
  if (score >= 65) return "#7a9e3b";
  if (score >= 40) return "#c17f3e";
  return "#b94040";
}

function loadColor(load: CognitiveLoad): string {
  if (load === "Low") return "#4a7c6f";
  if (load === "Medium") return "#7a9e3b";
  if (load === "High") return "#c17f3e";
  return "#b94040";
}

function metricColor(key: string, val: number): string {
  if (key === "avgSentenceLength") return val > 25 ? "#c17f3e" : "#4a7c6f";
  if (key === "passiveVoicePercent") return val > 20 ? "#b94040" : "#4a7c6f";
  if (key === "jargonDensity") return val > 15 ? "#b94040" : "#4a7c6f";
  if (key === "secondPersonPercent") return val < 50 ? "#c17f3e" : "#4a7c6f";
  return "#1a1a1a";
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = scoreColor(score);
  return (
    <div className="score-ring-wrap">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e8e6e0" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="score-ring-label">
        <span className="score-ring-num" style={{ color }}>{score}</span>
        <span className="score-ring-unit">/100</span>
      </div>
    </div>
  );
}

const typeLabel: Record<string, string> = {
  passive: "Passive voice",
  jargon: "Jargon",
  length: "Sentence length",
  person: "Second person",
  clarity: "Clarity",
};

export default function Home() {
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<Audience>("mixed");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.name.match(/\.(txt|md|mdx)$/i)) {
      setError("Please upload a .txt, .md, or .mdx file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setText((e.target?.result as string) ?? "");
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const analyze = async () => {
    if (!text.trim() || text.trim().length < 50) {
      setError("Please enter at least 50 characters to analyse.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), audience }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setText(""); setFileName(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <main className="app-wrap">
      <header className="app-header">
        <a href="https://adrian-raposo.vercel.app/#sa-tools" className="app-back">← All tools</a>
        <p className="app-eyebrow">AI Tools · Adrian Raposo</p>
        <h1 className="app-title">Doc Complexity <em>Scorer</em></h1>
        <p className="app-desc">
          Paste or upload documentation and score it against the <strong>Microsoft Style Guide (MSTP)</strong> —
          the gold standard for technical writing. Get compliance scores, violation flags, cognitive load ratings,
          and AI rewrite suggestions.
        </p>
      </header>

      <div className="card">
        <p className="card-label">Input</p>
        <div className="audience-row">
          <span className="audience-label">Audience</span>
          <div className="audience-tabs">
            {(["general", "mixed", "technical"] as Audience[]).map((a) => (
              <button key={a} className={`audience-tab${audience === a ? " active" : ""}`} onClick={() => setAudience(a)}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <textarea className="input-area"
          placeholder="Paste your documentation here — release notes, help articles, API docs, onboarding guides…"
          value={text}
          onChange={(e) => { setText(e.target.value); setFileName(null); }}
        />

        <div className={`drop-zone${dragOver ? " drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" accept=".txt,.md,.mdx" style={{ display: "none" }} onChange={handleFileInput} />
          <p className="drop-zone-text">
            {fileName
              ? <span className="file-loaded">📄 {fileName}</span>
              : <><span>Click to upload</span> or drag &amp; drop a .txt or .md file</>
            }
          </p>
        </div>

        <div className="input-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span className="char-count">{wordCount} words · {text.length} chars</span>
            {(text || result) && <button className="btn-clear" onClick={clear}>Clear</button>}
          </div>
          <button className="btn-analyze" onClick={analyze} disabled={loading || text.trim().length < 50}>
            {loading ? "Analysing…" : "Analyse →"}
          </button>
        </div>

        {error && <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--sev-high)" }}>{error}</p>}
      </div>

      {loading && (
        <div className="card loading-state">
          <div className="loading-spinner" />
          <p className="loading-text">Scoring against MSTP…</p>
        </div>
      )}

      {result && !loading && (
        <div className="card fade-up fd1">
          <p className="card-label">MSTP Analysis</p>

          <div className="score-hero">
            <ScoreRing score={result.mstpScore} />
            <div className="score-meta">
              <div className="score-grade" style={{ color: scoreColor(result.mstpScore) }}>
                {result.grade}
              </div>
              <div className="score-fk">
                <strong>MSTP Compliance</strong><br />
                <span style={{ color: "var(--ink-muted)", fontSize: "12px" }}>
                  Microsoft Style Guide · {audience === "general" ? "General audience" : audience === "technical" ? "Technical audience" : "Mixed audience"}
                </span>
              </div>
              <div className="cog-load-badge" style={{ borderColor: loadColor(result.cognitiveLoad), color: loadColor(result.cognitiveLoad) }}>
                <span className="cog-load-dot" style={{ background: loadColor(result.cognitiveLoad) }} />
                Cognitive load: <strong>{result.cognitiveLoad}</strong>
                <span className="cog-load-reason"> — {result.cognitiveLoadReason}</span>
              </div>
            </div>
          </div>

          <p className="score-summary">{result.summary}</p>

          <div className="result-section fade-up fd2">
            <div className="result-section-title">Metrics</div>
            <div className="metrics-row">
              <div className="metric-box">
                <div className="metric-val" style={{ color: metricColor("avgSentenceLength", result.metrics.avgSentenceLength) }}>{result.metrics.avgSentenceLength}</div>
                <div className="metric-lbl">Avg words<br />per sentence</div>
                <div className="metric-target">MSTP: &lt;25</div>
              </div>
              <div className="metric-box">
                <div className="metric-val" style={{ color: metricColor("passiveVoicePercent", result.metrics.passiveVoicePercent) }}>{result.metrics.passiveVoicePercent}%</div>
                <div className="metric-lbl">Passive<br />voice</div>
                <div className="metric-target">MSTP: &lt;20%</div>
              </div>
              <div className="metric-box">
                <div className="metric-val" style={{ color: metricColor("jargonDensity", result.metrics.jargonDensity) }}>{result.metrics.jargonDensity}%</div>
                <div className="metric-lbl">Jargon<br />density</div>
                <div className="metric-target">MSTP: &lt;15%</div>
              </div>
              <div className="metric-box">
                <div className="metric-val" style={{ color: metricColor("secondPersonPercent", result.metrics.secondPersonPercent) }}>{result.metrics.secondPersonPercent}%</div>
                <div className="metric-lbl">Second<br />person ("you")</div>
                <div className="metric-target">MSTP: &gt;50%</div>
              </div>
            </div>
          </div>

          {result.violations?.length > 0 && (
            <div className="result-section fade-up fd3">
              <div className="result-section-title">MSTP violations</div>
              <div className="highlight-list">
                {result.violations.map((v, i) => (
                  <div key={i} className={`highlight-item sev-${v.severity}`}>
                    <p className="highlight-sentence">"{v.sentence}"</p>
                    <div className="highlight-meta">
                      <div className="sev-dot" />
                      <span className="highlight-reason">{v.rule}</span>
                      <span className="violation-detail"> — {v.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.jargonTerms?.length > 0 && (
            <div className="result-section fade-up fd3">
              <div className="result-section-title">Jargon flagged</div>
              <div className="jargon-chips">
                {result.jargonTerms.map((term, i) => (
                  <span key={i} className="jargon-chip">{term}</span>
                ))}
              </div>
            </div>
          )}

          {result.suggestions?.length > 0 && (
            <div className="result-section fade-up fd4">
              <div className="result-section-title">Rewrite suggestions</div>
              <div className="suggestion-list">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item">
                    <div className={`suggestion-type stype-${s.type}`}>
                      {typeLabel[s.type] ?? s.type}
                      <span className="suggestion-rule"> · {s.rule}</span>
                    </div>
                    <div className="suggestion-body">
                      <p className="suggestion-original">{s.original}</p>
                      <p className="suggestion-arrow">↓ Suggested rewrite</p>
                      <p className="suggestion-rewrite">{s.rewrite}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="app-footer">
        Scored against Microsoft Style Guide (MSTP) · Powered by Groq · Built by Adrian Raposo
      </footer>
    </main>
  );
}
