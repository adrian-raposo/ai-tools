"use client";

import { useState, useCallback } from "react";

type Audience = "customer" | "internal" | "executive" | "changelog";
type Tone = "friendly" | "formal" | "enterprise" | "technical";

interface GeneratedResult {
  customer: string;
  internal: string;
  executive: string;
  changelog: string;
  highlights: string[];
}

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "customer",   label: "Customer" },
  { key: "internal",   label: "Internal" },
  { key: "executive",  label: "Executive" },
  { key: "changelog",  label: "Changelog" },
];

const TONES: { key: Tone; label: string; desc: string }[] = [
  { key: "friendly",   label: "Friendly",   desc: "Warm SaaS tone" },
  { key: "formal",     label: "Formal",     desc: "Professional docs" },
  { key: "enterprise", label: "Enterprise", desc: "Corporate style" },
  { key: "technical",  label: "Technical",  desc: "Developer-focused" },
];

const PLACEHOLDER = `Paste raw engineering notes, Jira tickets, git commits, or mixed notes:

PROD-1234
Added MFA support for SSO users

PROD-1235
Fixed export timeout issue

PROD-1236
Added CSV import support

PROD-1237
Improved dashboard loading performance`;

// ── Simple markdown renderer ──────────────────────────────────────────────
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])/gm, "")
    .trim();
}

export default function Home() {
  const [notes, setNotes]       = useState("");
  const [version, setVersion]   = useState("");
  const [date, setDate]         = useState("");
  const [tone, setTone]         = useState<Tone>("friendly");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<GeneratedResult | null>(null);
  const [activeTab, setActiveTab] = useState<Audience>("customer");
  const [copied, setCopied]     = useState<string | null>(null);

  const generate = async () => {
    if (!notes.trim() || notes.trim().length < 20) {
      setError("Please enter at least 20 characters of notes.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim(), version, date, tone }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setActiveTab("customer");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setNotes(""); setVersion(""); setDate("");
    setResult(null); setError(null);
  };

  const activeContent = result?.[activeTab] ?? "";

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const exportFile = useCallback((content: string, ext: "md" | "html") => {
    const body = ext === "html"
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Release Notes</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.7}h1,h2,h3{margin-top:1.5em}ul{padding-left:1.5em}</style></head><body>${renderMarkdown(content)}</body></html>`
      : content;
    const blob = new Blob([body], { type: ext === "html" ? "text/html" : "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `release-notes-${activeTab}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab]);

  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  return (
    <main className="app-wrap">

      {/* ── Header ── */}
      <header className="app-header">
        <a href="https://adrian-raposo.vercel.app/#sa-tools" className="app-back">← All tools</a>
        <p className="app-eyebrow">AI Tools · Adrian Raposo</p>
        <h1 className="app-title">Release Notes <em>Generator</em></h1>
        <p className="app-desc">
          Paste raw engineering notes, Jira tickets, or git commits. Get polished release notes
          for every audience — instantly.
        </p>
      </header>

      {/* ── Main layout ── */}
      <div className="rn-layout">

        {/* ── LEFT: Input panel ── */}
        <div className="rn-panel rn-panel-left">

          {/* Version + date */}
          <div className="card">
            <p className="card-label">Release info</p>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Version</label>
                <input
                  className="field-input"
                  placeholder="e.g. 4.2.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">Date <span className="field-optional">(optional)</span></label>
                <input
                  className="field-input"
                  placeholder="e.g. June 2026"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tone */}
          <div className="card">
            <p className="card-label">Tone</p>
            <div className="tone-grid">
              {TONES.map((t) => (
                <button
                  key={t.key}
                  className={`tone-btn${tone === t.key ? " active" : ""}`}
                  onClick={() => setTone(t.key)}
                >
                  <span className="tone-label">{t.label}</span>
                  <span className="tone-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes input */}
          <div className="card">
            <p className="card-label">Raw notes</p>
            <textarea
              className="input-area rn-textarea"
              placeholder={PLACEHOLDER}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="input-footer">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="char-count">{wordCount} words</span>
                {(notes || result) && <button className="btn-clear" onClick={clear}>Clear</button>}
              </div>
              <button
                className="btn-analyze"
                onClick={generate}
                disabled={loading || notes.trim().length < 20}
              >
                {loading ? "Generating…" : "Generate →"}
              </button>
            </div>
            {error && <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--sev-high)" }}>{error}</p>}
          </div>
        </div>

        {/* ── RIGHT: Output panel ── */}
        <div className="rn-panel rn-panel-right">

          {/* Empty state */}
          {!result && !loading && (
            <div className="rn-empty">
              <div className="rn-empty-icon">✦</div>
              <p className="rn-empty-title">Your release notes will appear here</p>
              <p className="rn-empty-desc">Fill in the details on the left and hit Generate</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="card loading-state">
              <div className="loading-spinner" />
              <p className="loading-text">Generating release notes…</p>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="fade-up fd1">

              {/* Highlights */}
              {result.highlights?.length > 0 && (
                <div className="card rn-highlights">
                  <p className="card-label">Top highlights</p>
                  <div className="highlights-list">
                    {result.highlights.map((h, i) => (
                      <div key={i} className="highlight-pill">
                        <span className="highlight-num">{i + 1}</span>
                        {h}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs + content */}
              <div className="card rn-output-card">
                <div className="rn-tabs">
                  {AUDIENCES.map((a) => (
                    <button
                      key={a.key}
                      className={`rn-tab${activeTab === a.key ? " active" : ""}`}
                      onClick={() => setActiveTab(a.key)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                {/* Executive: plain prose */}
                {activeTab === "executive" ? (
                  <div className="rn-executive">
                    <p>{result.executive}</p>
                  </div>
                ) : (
                  <div
                    className="rn-markdown"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(activeContent) }}
                  />
                )}

                {/* Export actions */}
                <div className="rn-actions">
                  <button className="rn-action-btn" onClick={() => copyToClipboard(activeContent, "copy")}>
                    {copied === "copy" ? "✓ Copied!" : "Copy"}
                  </button>
                  <button className="rn-action-btn" onClick={() => exportFile(activeContent, "md")}>
                    Export .md
                  </button>
                  <button className="rn-action-btn" onClick={() => exportFile(activeContent, "html")}>
                    Export .html
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="app-footer">
        Powered by Groq · Llama 3.1 · Built by Adrian Raposo
      </footer>
    </main>
  );
}
