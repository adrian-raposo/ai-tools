"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [overlayMessages, setOverlayMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [overlayInput, setOverlayInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [overlayLoading, setOverlayLoading] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [openCareer, setOpenCareer] = useState<string | null>(null);
  const [typewriterText, setTypewriterText] = useState("Technical Documentation Leader");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showOverlaySuggestions, setShowOverlaySuggestions] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const overlayInputRef = useRef<HTMLTextAreaElement>(null);
  const chatHasMessages = useRef(false);
  const overlayHasMessages = useRef(false);

  // Scroll chat container ONLY after a new message is added
  useEffect(() => {
    if (!chatHasMessages.current && chatMessages.length === 0) return;
    chatHasMessages.current = true;
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    if (!overlayHasMessages.current && overlayMessages.length === 0) return;
    overlayHasMessages.current = true;
    const el = overlayContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [overlayMessages, overlayLoading]);

  // Typewriter
  useEffect(() => {
    const titles = [
      "Technical Documentation Leader",
      "AI Workflow Builder",
      "Help Center Strategist",
      "Technical Writing Team Lead",
      "Documentation Systems Thinker",
    ];
    let ti = 0, ci = 0, deleting = false;
    let timeout: ReturnType<typeof setTimeout>;
    const type = () => {
      const cur = titles[ti];
      if (!deleting) {
        ci++;
        setTypewriterText(cur.slice(0, ci));
        if (ci === cur.length) { deleting = true; timeout = setTimeout(type, 2000); return; }
      } else {
        ci--;
        setTypewriterText(cur.slice(0, ci));
        if (ci === 0) { deleting = false; ti = (ti + 1) % titles.length; }
      }
      timeout = setTimeout(type, deleting ? 35 : 65);
    };
    const init = setTimeout(() => { setTypewriterText(""); type(); }, 1500);
    return () => { clearTimeout(init); clearTimeout(timeout); };
  }, []);

  // Disable browser scroll restoration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Scroll reveal
  useEffect(() => {
    // One-way observer: animates in once, never hides (for interactive sections)
    const oneWayObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          oneWayObserver.unobserve(e.target);
        }
      }),
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    // Two-way observer: animates in and out (for regular sections)
    const twoWayObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
        else e.target.classList.remove("visible");
      }),
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    const timer = setTimeout(() => {
      document.querySelectorAll(".reveal, .sdivider").forEach((el) => {
        const inInteractive = el.closest("#sa-career") || el.closest("#sa-skills");
        if (inInteractive) {
          oneWayObserver.observe(el);
        } else {
          twoWayObserver.observe(el);
        }
      });
    }, 200);

    return () => {
      clearTimeout(timer);
      oneWayObserver.disconnect();
      twoWayObserver.disconnect();
    };
  }, []);

  // Progress bar + nav
  useEffect(() => {
    const onScroll = () => {
      const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      const bar = document.getElementById("pbar");
      if (bar) bar.style.width = pct + "%";
      const nav = document.getElementById("mainnav");
      if (nav) nav.classList.toggle("scrolled", window.scrollY > 20);
      // Active nav
      const ids = ["sa-about", "sa-chat", "sa-how", "sa-career", "sa-tools", "sa-contact"];
      let active = "sa-home";
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80) {
        active = "sa-contact";
      } else {
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el && el.offsetTop - 140 <= window.scrollY) active = id;
        });
      }
      document.querySelectorAll(".navlink").forEach((el) => {
        el.classList.toggle("active", el.getAttribute("data-s") === active);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Overlay keyboard
  useEffect(() => {
    if (overlayOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => overlayInputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = "";
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOverlayOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const callAPI = async (messages: ChatMessage[]) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.reply as string;
  };

  const sendChat = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const msg: ChatMessage = { role: "user", content: text };
    const updated = [...chatMessages, msg];
    setChatMessages(updated);
    setChatInput("");
    setShowSuggestions(false);
    setChatLoading(true);
    try {
      const reply = await callAPI(updated);
      setChatMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((p) => [...p, { role: "assistant", content: "Sorry, something went wrong. Reach out at raposo788@gmail.com" }]);
    }
    setChatLoading(false);
  }, [chatMessages, chatLoading]);

  const sendOverlay = useCallback(async (text: string) => {
    if (!text.trim() || overlayLoading) return;
    const msg: ChatMessage = { role: "user", content: text };
    const updated = [...overlayMessages, msg];
    setOverlayMessages(updated);
    setOverlayInput("");
    setShowOverlaySuggestions(false);
    setOverlayLoading(true);
    try {
      const reply = await callAPI(updated);
      setOverlayMessages((p) => [...p, { role: "assistant", content: reply }]);
    } catch {
      setOverlayMessages((p) => [...p, { role: "assistant", content: "Sorry, something went wrong. Reach out at raposo788@gmail.com" }]);
    }
    setOverlayLoading(false);
  }, [overlayMessages, overlayLoading]);

  const suggestions = ["What makes Adrian different?", "What AI tools has he built?", "How does he lead his team?", "What's his documentation philosophy?"];

  const ChatBubbles = ({ messages, loading }: { messages: ChatMessage[], loading: boolean }) => (
    <>
      <div className="chat-msg bot">
        <div className="cmavatar">🤖</div>
        <div className="cbubble">Hi! I&apos;m an AI trained on Adrian&apos;s background. Ask me anything — his experience, how he leads teams, the tools he&apos;s built, or what makes him different.</div>
      </div>
      {messages.map((m, i) => (
        <div key={i} className={`chat-msg ${m.role === "user" ? "user" : "bot"}`}>
          <div className="cmavatar">{m.role === "user" ? "👤" : "🤖"}</div>
          <div className="cbubble">{m.content}</div>
        </div>
      ))}
      {loading && (
        <div className="chat-msg bot">
          <div className="cmavatar">🤖</div>
          <div className="cbubble"><div className="tdots"><span/><span/><span/></div></div>
        </div>
      )}
    </>
  );

  const [openSkill, setOpenSkill] = useState<string | null>(null);

  const SkillGroup = ({ title, skills }: { title: string; skills: string[] }) => (
    <div className={`skill-group${openSkill === title ? " open" : ""}`}>
      <button
        type="button"
        className="skill-group-header"
        onClick={() => setOpenSkill(openSkill === title ? null : title)}
      >
        <span>{title}</span>
        <span className="skill-chevron">{openSkill === title ? "−" : "+"}</span>
      </button>
      {openSkill === title && (
        <div className="skill-pills">
          {skills.map((s) => <span key={s} className="skill-pill">{s}</span>)}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div id="pbar" className="pbar" />

      <nav id="mainnav">
        <ul className="navlinks">
          {[
            { s: "sa-home", label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
            { s: "sa-about", label: "About", action: () => scrollTo("sa-about") },
            { s: "sa-how", label: "How I Work", action: () => scrollTo("sa-how") },
            { s: "sa-career", label: "Career", action: () => scrollTo("sa-career") },
            { s: "sa-tools", label: "AI Tools", action: () => scrollTo("sa-tools") },
            { s: "sa-contact", label: "Contact", action: () => scrollTo("sa-contact") },
          ].map((item) => (
            <li key={item.s}>
              <button type="button" className={`navlink${item.s === "sa-home" ? " active" : ""}`} data-s={item.s} onClick={item.action}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <p className="hero-eyebrow">
            <span>{typewriterText}</span><span className="twcursor" />
          </p>
          <h1 className="hero-name">Adrian<br /><em>Raposo</em></h1>
          <p className="hero-tagline">I make documentation work — <strong>for the people who read it, the teams who write it, and the products that need it.</strong></p>
          <p className="hero-sub">12+ years in enterprise SaaS documentation, including 4+ years leading technical writing teams. Currently at Gainsight — managing a team, driving documentation strategy, and using AI to help writers work faster and focus on what matters.</p>
          <div className="hero-links">
            <button type="button" className="btn btn-primary" onClick={() => scrollTo("sa-about")}>Read my story →</button>
            <button type="button" className="btn btn-chat" onClick={() => setOverlayOpen(true)}>💬 Poke the AI. Ask me stuff.</button>
            <a href="https://linkedin.com/in/adrianraposo" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">LinkedIn</a>
            <a href="https://github.com/adrian-raposo" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">GitHub</a>
          </div>
        </div>
      </div>

      {/* ABOUT */}
      <section id="sa-about">
        <p className="slabel reveal from-left">Background</p>
        <h2 className="stitle reveal from-left rd1">About Me</h2>
        <div className="sdivider reveal" />
        <div className="about-body">
          <div className="about-text reveal">
            <p>I started my career at <strong>Packt Publishing</strong> editing technical books, moved through consumer tech and enterprise IT, and eventually became the lone Technical Writer for entire products — building documentation modules from scratch, solo. That experience taught me something important: <em>good documentation is never just about writing.</em> It&apos;s about understanding users, anticipating confusion, and making complex things feel simple.</p>
            <p>Over 12 years, I&apos;ve been a team of one and a team lead. I&apos;ve scripted, recorded, and edited training videos. I&apos;ve managed email campaigns, handled customer feedback, built e-learning courses on LMS platforms. At <strong>Gainsight</strong>, I now lead a team of technical writers while administering a Help Center serving 200K+ monthly users and driving our AI initiatives.</p>
            <p>My career has been defined by <strong>continuous learning and adaptability</strong>. I lean into new challenges, run POCs, and roll up my sleeves to build what doesn&apos;t exist yet. Right now, that means using Claude and AI tooling to automate the tedious parts of documentation — so my team can spend more time on the work that actually requires human judgment.</p>
            <p>I approach leadership the same way I approach content: <em>with empathy.</em> Understanding what users need, or what my team needs to succeed, has always been my compass.</p>
          </div>
          <div className="about-aside reveal rd2">
            {[
              { num: "12", count: true, label: "years in enterprise SaaS documentation" },
              { num: "4", count: true, label: "years leading technical writing teams" },
              { num: "200K+", count: false, label: "monthly Help Center users" },
              { num: "5", count: true, label: "companies, always the person who owns the docs" },
            ].map((s) => (
              <div key={s.label} className="astat">
                <div className="astat-num" {...(s.count ? { "data-count": s.num } : {})}>{s.num}{s.count ? "+" : ""}</div>
                <div className="astat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHAT SECTION */}
      <section id="sa-chat">
        <p className="slabel reveal from-left">Interactive</p>
        <h2 className="stitle reveal from-left rd1">Ask Me Anything</h2>
        <div className="sdivider reveal" />
        <p className="chat-intro reveal">Curious about my background, how I work, or what I&apos;ve built? Ask below — this is an AI that knows my story.</p>
        <div className="chat-widget reveal rd1">
          <div className="chat-header">
            <div className="chavatar">👤</div>
            <div className="chinfo"><h3>Adrian Raposo</h3><p>Technical Documentation Leader · Bengaluru</p></div>
            <div className="chstatus" />
          </div>
          <div className="chat-msgs" ref={chatContainerRef}>
            <ChatBubbles messages={chatMessages} loading={chatLoading} />
          </div>
          {showSuggestions && (
            <div className="chat-suggs">
              {suggestions.map((s) => <button type="button" key={s} className="chat-sugg" onClick={() => sendChat(s)}>{s}</button>)}
            </div>
          )}
          <div className="chat-input-row">
            <textarea className="chat-inp" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
              placeholder="Ask something about Adrian…" rows={1} />
            <button type="button" className="chat-send" onClick={() => sendChat(chatInput)} disabled={chatLoading || !chatInput.trim()}>Send</button>
          </div>
        </div>
      </section>

      {/* HOW I WORK */}
      <section id="sa-how">
        <p className="slabel reveal from-left">Approach</p>
        <h2 className="stitle reveal from-left rd1">How I Work</h2>
        <div className="sdivider reveal" />
        <div className="how-grid">
          {[
            { icon: "🗺️", title: "Documentation Strategy", desc: "I think about docs as a system — information architecture, content lifecycles, discoverability, and how documentation connects to product adoption and support reduction.", d: "rd1" },
            { icon: "🎯", title: "User Empathy First", desc: "Every document starts with a question: what does this person actually need to do? I build documentation around user goals, not product features. Complexity is the enemy.", d: "rd2" },
            { icon: "👥", title: "Team Leadership", desc: "I lead in a player-coach model — mentoring writers, reviewing work, and setting standards while staying hands-on. I build environments where writers grow.", d: "rd3" },
            { icon: "🎬", title: "Content & Video", desc: "I've scripted, recorded, edited, and voiced training videos from scratch. Audio-visual content is where user assistance is heading — faster absorption, wider reach.", d: "rd1" },
            { icon: "🤖", title: "AI-Augmented Workflows", desc: "I use Claude and prompt engineering to automate the repetitive parts of documentation — migrations, SEO tagging, quality checks, release notes — so the team can do deeper work.", d: "rd2", accent: true },
            { icon: "📊", title: "Data-Driven Improvement", desc: "I use analytics to identify content gaps, broken links, low-performing articles, and search opportunities. Documentation should improve continuously.", d: "rd3" },
          ].map((c) => (
            <div key={c.title} className={`how-card reveal ${c.d}${c.accent ? " accent-card" : ""}`}>
              <div className="how-icon">{c.icon}</div>
              <h3 className="how-title">{c.title}</h3>
              <p className="how-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CAREER */}
      <section id="sa-career">
        <p className="slabel reveal from-left">Experience</p>
        <h2 className="stitle reveal from-left rd1">Career</h2>
        <div className="sdivider reveal" />
        <div className="career-list">
          {[
            {
              id: "gainsight", company: "Gainsight", role: "Team Lead, Technical Communications", period: "2022 — Present",
              logo: { bg: "#e8f0ee", color: "#4a7c6f", l: "G" }, d: "",
              tags: ["Team Leadership", "AI Workflows", "Documentation Strategy", "Digital Adoption"],
              body: (
                <div className="career-subcats">
                  {[
                    { title: "Team Leadership", bullets: ["Lead and mentor a team of <strong>4 technical writers</strong> in a player-coach capacity — editorial reviews, career development, quality standards", "Actively involved in the full recruiting lifecycle — screening resumes, conducting interviews, assessing candidates, and onboarding new writers", "Conduct biannual performance appraisals and develop tailored growth plans for team members", "Lead GenAI efforts team-wide and org-wide: driving POCs, prompt engineering, and AI-powered workflow optimization"] },
                    { title: "Documentation Operations", bullets: ["Own the Help Center serving <strong>200K+ monthly users</strong> — content structure, publishing workflows, documentation lifecycle", "Lead documentation strategy across <strong>4 enterprise SaaS products</strong>", "Drive continuous improvements to Help Center UX, navigation, and search"] },
                    { title: "AI-Driven Initiatives", bullets: ["Built automation using Claude that <strong>migrated 400+ Help Center articles</strong> to structured Google Docs", "Added <strong>SEO metadata to 350+ articles</strong> using AI-assisted workflows", "Built a <strong>Release Notes Converter</strong> — transforms changelogs into structured release notes", "Built <strong>GenSearch</strong> — an internal AI search tool for the knowledge base", "Experimented with a <strong>Slack bot for knowledge base Q&A</strong>"] },
                    { title: "Tools & Vendor Evaluation", bullets: ["Assess and evaluate documentation tools and platforms — running POCs, comparing vendors, and making recommendations based on team needs and product fit", "Previously led evaluation and onboarding of <strong>DAP tools</strong> including Gainsight PX and Whatfix — from vendor assessment through implementation", "Stay current on the documentation tooling landscape and proactively identify opportunities to improve team workflows"] },
                    { title: "Digital Adoption & In-App Guidance", bullets: ["Implement in-app guidance using <strong>Gainsight PX and Whatfix</strong>", "Create UX copy for new features; perform usability testing"] },
                    { title: "Analytics & Content Health", bullets: ["Lead content health initiatives using AI and data analysis — outdated content, broken links, SEO gaps", "Use analytics to drive evidence-based improvements to documentation strategy"] },
                  ].map((sub) => (
                    <div key={sub.title} className="career-subcat">
                      <p className="csubtitle">{sub.title}</p>
                      <ul className="cbullets">{sub.bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: b }} />)}</ul>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              id: "odessa", company: "Odessa", role: "Lead Technical Writer", roleExtra: "· prev. Associate Lead", period: "2019 — 2022",
              logo: { bg: "#fff3e0", color: "#e65100", l: "O" }, d: "rd1",
              promotion: "↑ Promoted from Associate Lead to Lead Technical Writer",
              tags: ["Documentation", "Video Production", "E-learning", "FinTech"],
              body: <ul className="cbullets"><li>Produced full documentation sets for a global FinTech platform — user manuals, technical notes, troubleshooting guides, FAQs, online help</li><li>Sole owner of all video and e-learning requirements: scripting, recording, editing, voiceovers, LMS training courses</li><li>Collaborated with developers, designers, and PMs to translate complex product functionality into clear documentation</li><li>Created release notes for every update; provided UX writing inputs for tooltips, error messages, and UI text</li></ul>,
            },
            {
              id: "wipro", company: "Wipro", role: "Assistant Manager", period: "2017 — 2019",
              logo: { bg: "#e8eaf6", color: "#3949ab", l: "W" }, d: "rd2",
              tags: ["Technical Writing", "Enterprise IT"],
              body: <ul className="cbullets"><li>Sole Technical Writer for <strong>Wipro Harmony</strong>, a web-based business process transformation tool</li><li>Responsible for all content and documentation throughout the product lifecycle</li></ul>,
            },
            {
              id: "justdial", company: "Justdial", role: "Sr. Technical Content Writer", roleExtra: "· prev. Technical Content Writer", period: "2015 — 2017",
              logo: { bg: "#fce4ec", color: "#c62828", l: "J" }, d: "rd3",
              promotion: "↑ Promoted from Technical Content Writer",
              tags: ["Content Writing", "Consumer Tech"],
              body: <><ul className="cbullets"><li>Individually handled all documentation and content for the entire product</li><li>Managed email and SMS marketing campaigns for continued user engagement</li></ul><div className="award-badge">🏆 ACE Achiever of the Year — awarded for individually and excellently handling all product documentation</div></>,
            },
            {
              id: "packt", company: "Packt Publishing", role: "Content Development Editor", roleExtra: "· prev. Technical Editor", period: "2013 — 2015",
              logo: { bg: "#f3e5f5", color: "#6a1b9a", l: "P" }, d: "rd4",
              promotion: "↑ Promoted from Technical Editor",
              tags: ["Technical Editing", "Publishing"],
              body: <ul className="cbullets"><li>Edited and developed technical books and learning content for a global technology publisher</li><li>Where it all started — building the foundation of technical communication and structured content thinking</li></ul>,
            },
          ].map((item) => (
            <div key={item.id} className={`career-item${openCareer === item.id ? " open" : ""}`}>
              <div role="button" tabIndex={0} className="career-header"
                onClick={() => setOpenCareer(openCareer === item.id ? null : item.id)}
                onKeyDown={(e) => e.key === "Enter" && setOpenCareer(openCareer === item.id ? null : item.id)}>
                <div className="clogo" style={{ background: item.logo.bg, color: item.logo.color }}>{item.logo.l}</div>
                <div className="cinfo">
                  <div className="ccompany">{item.company}</div>
                  <div className="crole">{item.role}{(item as {roleExtra?: string}).roleExtra && <span className="crole-extra">{(item as {roleExtra?: string}).roleExtra}</span>}</div>
                </div>
                <div className="cperiod">{item.period}</div>
                <div className="cchevron">▼</div>
              </div>
              {openCareer === item.id && (
                <div className="cbody">
                  {(item as {promotion?: string}).promotion && <div className="cpromo">{(item as {promotion?: string}).promotion}</div>}
                  <div className="ctags">{item.tags.map((t) => <span key={t} className="ctag">{t}</span>)}</div>
                  {item.body}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* AI TOOLS */}
      <section id="sa-tools">
        <p className="slabel reveal from-left">Portfolio</p>
        <h2 className="stitle reveal from-left rd1">AI Tools I&apos;ve Built</h2>
        <div className="sdivider reveal" />
        <p className="tools-intro reveal">Real tools solving real documentation problems — built with Next.js, Claude, and Groq. Including this site itself.</p>
        <div className="tools-grid">
          <a href="https://ai-tools-ask-my-docs-six.vercel.app" target="_blank" rel="noopener noreferrer" className="tool-card reveal rd1">
            <div className="ticon">📄</div>
            <h3 className="ttitle">Ask My Docs</h3>
            <p className="tdesc">Upload any markdown or text documentation and ask questions in plain language. Uses in-browser embeddings and Groq&apos;s Llama model — answers sourced from your content, always cited.</p>
            <div className="tfooter"><span className="ttag">RAG · EMBEDDINGS · GROQ</span><span className="tarrow">→</span></div>
          </a>
          {[
            { icon: "📋", title: "Release Notes Converter", desc: "Transform raw engineering changelogs into structured, audience-ready release notes. Handles tone, format, and targeting automatically." },
            { icon: "✍️", title: "Style Guide Enforcer", desc: "Paste a document and check it against a style guide. AI flags violations and suggests rewrites for cleaner, more consistent documentation." },
            { icon: "📊", title: "Doc Complexity Scorer", desc: "Analyze readability, jargon density, and sentence complexity. Get AI-powered suggestions to simplify content for your target audience." },
          ].map((t, i) => (
            <div key={t.title} className={`tool-card tool-wip reveal rd${(i % 2) + 1}`}>
              <div className="ticon">{t.icon}</div>
              <h3 className="ttitle">{t.title}</h3>
              <p className="tdesc">{t.desc}</p>
              <div className="tfooter"><span className="wip-badge">COMING SOON</span></div>
            </div>
          ))}
        </div>

      </section>

      {/* SKILLS */}
      <section id="sa-skills">
        <p className="slabel reveal from-left">Capabilities</p>
        <h2 className="stitle reveal from-left rd1">Skills</h2>
        <div className="sdivider reveal" />
        <p className="skills-intro reveal">Keywords for the ctrl+F crowd — click any category to expand.</p>
        <div className="skills-list">
          {[
            { title: "Leadership & Strategy", skills: ["Team Leadership", "Documentation Strategy", "Content Governance", "Agile", "Cross-Functional Collaboration", "Documentation Operations", "Recruiting & Hiring", "Performance Management", "Resource Planning"] },
            { title: "AI & Automation", skills: ["Claude", "ChatGPT", "Prompt Engineering", "Workflow Automation", "Custom GPT Development", "AI-Assisted Content Review", "Lovable"] },
            { title: "Digital Adoption Platforms", skills: ["Gainsight PX", "Whatfix", "Pendo", "Userpilot"] },
            { title: "Documentation & Knowledge Platforms", skills: ["Adobe RoboHelp", "WordPress", "NICE CXone Expert", "Confluence", "Notion", "Jira"] },
            { title: "Multimedia & Learning", skills: ["Camtasia", "Adobe Premiere Pro", "Adobe Captivate", "SnagIt", "Audacity", "LMS Content Development", "Instructional Design"] },
            { title: "Design & Dev", skills: ["Figma", "HTML", "Next.js", "Adobe Photoshop", "Google Workspace"] },
          ].map((group) => (
            <SkillGroup key={group.title} title={group.title} skills={group.skills} />
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="sa-contact">
        <p className="slabel reveal from-left">Get in touch</p>
        <h2 className="stitle reveal from-left rd1">Contact</h2>
        <div className="sdivider reveal" />
        <div className="contact-grid">
          <div className="contact-text reveal">
            <p>I&apos;m open to leadership roles in technical writing and documentation — Head of Documentation, Technical Writing Manager, Senior Manager Technical Writing, or similar.</p>
            <p>Happy to talk about team management, AI-driven documentation strategy, or building things that make writers&apos; lives easier.</p>
          </div>
          <div className="contact-links reveal rd2">
            <a href="mailto:raposo788@gmail.com" className="contact-link"><span>✉️</span> raposo788@gmail.com</a>
            <a href="https://linkedin.com/in/adrianraposo" target="_blank" rel="noopener noreferrer" className="contact-link"><span>💼</span> linkedin.com/in/adrianraposo</a>
            <a href="https://github.com/adrian-raposo" target="_blank" rel="noopener noreferrer" className="contact-link"><span>🐙</span> github.com/adrian-raposo</a>
          </div>
        </div>
      </section>

      <footer>© 2026 Adrian Raposo · He can read the code. Claude wrote most of it.</footer>

      {/* OVERLAY */}
      <div className={`chat-overlay${overlayOpen ? " open" : ""}`}>
        <div className="covbackdrop" onClick={() => setOverlayOpen(false)} />
        <div className="covpanel">
          <div className="chat-header" style={{ position: "relative" }}>
            <div className="chavatar">👤</div>
            <div className="chinfo"><h3>Adrian Raposo</h3><p>Ask me about my experience, how I work, or what I&apos;ve built</p></div>
            <div className="chstatus" />
            <button type="button" className="covclose" onClick={() => setOverlayOpen(false)}>✕</button>
          </div>
          <div className="chat-msgs" ref={overlayContainerRef}>
            <ChatBubbles messages={overlayMessages} loading={overlayLoading} />
          </div>
          {showOverlaySuggestions && (
            <div className="chat-suggs">
              {suggestions.map((s) => <button type="button" key={s} className="chat-sugg" onClick={() => sendOverlay(s)}>{s}</button>)}
            </div>
          )}
          <div className="chat-input-row">
            <textarea ref={overlayInputRef} className="chat-inp" value={overlayInput}
              onChange={(e) => setOverlayInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendOverlay(overlayInput); } }}
              placeholder="Ask something about Adrian…" rows={1} />
            <button type="button" className="chat-send" onClick={() => sendOverlay(overlayInput)} disabled={overlayLoading || !overlayInput.trim()}>Send</button>
          </div>
        </div>
      </div>
    </>
  );
}
