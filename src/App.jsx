import { useState, useRef } from "react";

// ── API HELPER ────────────────────────────────────────────────────
async function callClaude({ messages, system, tools, max_tokens }) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, tools, max_tokens }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data.content.filter(b => b.type === "text").map(b => b.text).join("");
}

// ── SCORE COLORS ──────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 75) return { fill: "#639922", bg: "#EAF3DE", text: "#27500A", border: "#c0dd97" };
  if (s >= 50) return { fill: "#BA7517", bg: "#FAEEDA", text: "#633806", border: "#FAC775" };
  return { fill: "#A32D2D", bg: "#FCEBEB", text: "#501313", border: "#F7C1C1" };
}

// ── INPUT FORM ────────────────────────────────────────────────────
function InputForm({ onStart, error }) {
  const [f, setF] = useState({
    company: "", role: "", url: "",
    objective: "Discovery call", stage: "Early — first contact",
    product: "", competitors: "", challenges: "",
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <div style={s.formWrap}>
      <div style={s.formGrid}>
        <div>
          <label style={s.label}>Prospect company</label>
          <input placeholder="e.g. Acme Manufacturing" value={f.company} onChange={e => set("company", e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Stakeholder role</label>
          <input placeholder="e.g. VP Finance, CTO" value={f.role} onChange={e => set("role", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={s.label}>
          Company URL&nbsp;
          <span style={{ fontWeight: 400, opacity: 0.6, textTransform: "none", letterSpacing: 0 }}>
            (website, news article, LinkedIn — AI fetches live data)
          </span>
        </label>
        <input placeholder="https://company.com or paste any relevant link..." value={f.url} onChange={e => set("url", e.target.value)} />
      </div>

      <div style={s.formGrid}>
        <div>
          <label style={s.label}>Meeting objective</label>
          <select value={f.objective} onChange={e => set("objective", e.target.value)}>
            {["Discovery call", "Product demo", "Proposal review", "Negotiation", "Executive briefing", "Renewal discussion"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Deal stage</label>
          <select value={f.stage} onChange={e => set("stage", e.target.value)}>
            {["Early — first contact", "Mid — qualified opportunity", "Late — shortlisted", "Closing — final decision"].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      </div>

      <div style={s.formGrid}>
        <div>
          <label style={s.label}>Your product / solution</label>
          <input placeholder="e.g. ERP for manufacturers" value={f.product} onChange={e => set("product", e.target.value)} />
        </div>
        <div>
          <label style={s.label}>Competitors involved</label>
          <input placeholder="e.g. SAP, Oracle" value={f.competitors} onChange={e => set("competitors", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={s.label}>Known challenges or context</label>
        <textarea rows={3} placeholder="e.g. Failed ERP rollout last year, budget review in 90 days, CFO is skeptical of new vendors..." value={f.challenges} onChange={e => set("challenges", e.target.value)} style={{ resize: "vertical" }} />
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <button style={s.btnPrimary} onClick={() => onStart(f)}>
        ▶ &nbsp;Start meeting simulation
      </button>
    </div>
  );
}

// ── LOADING VIEW ──────────────────────────────────────────────────
function LoadingView({ step, company }) {
  const steps = [
    { icon: "🔍", label: "Fetching company intelligence" + (company ? " for " + company : "") + "..." },
    { icon: "🧠", label: "Building stakeholder persona..." },
    { icon: "🚪", label: "Opening the meeting room..." },
  ];
  return (
    <div style={{ padding: "3rem 0", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320, margin: "0 auto" }}>
        {steps.map((st, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, opacity: i + 1 <= step ? 1 : 0.3, color: i + 1 < step ? "#3B6D11" : "var(--text)", transition: "all 0.5s" }}>
            <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{i + 1 < step ? "✓" : st.icon}</span>
            <span>{st.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CHAT VIEW ─────────────────────────────────────────────────────
function ChatView({ sim, conv, msgCount, aiTyping, userInput, setUserInput, onSend, onEnd, hasContext, chatRef }) {
  return (
    <div>
      <div style={s.chatHeader}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{sim.objective || "Meeting"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{[sim.role, sim.company].filter(Boolean).join(" · ") || "Practice session"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hasContext && (
            <span style={s.livePill}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3B6D11", animation: "pulse 1.5s infinite", display: "inline-block" }} />
              Live data
            </span>
          )}
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{msgCount} exchange{msgCount !== 1 ? "s" : ""}</span>
          <button style={s.btnDanger} onClick={onEnd}>🏁 End &amp; debrief</button>
        </div>
      </div>

      <div ref={chatRef} style={s.chatBox}>
        {conv.map((m, i) => (
          <div key={i} style={{ ...s.bubble, ...(m.role === "user" ? s.bubbleUser : s.bubbleAI), animation: "fadeIn 0.25s ease" }}>
            {m.role === "assistant" && (
              <div style={s.bubbleRole}>{(sim.role || "STAKEHOLDER").toUpperCase()}</div>
            )}
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{m.content}</p>
          </div>
        ))}
        {aiTyping && (
          <div style={{ ...s.bubble, ...s.bubbleAI }}>
            <div style={s.bubbleRole}>{(sim.role || "STAKEHOLDER").toUpperCase()}</div>
            <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "3px 0" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--muted)", display: "inline-block", animation: `blink 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
  <textarea
    value={userInput}
    onChange={e => setUserInput(e.target.value)}
    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
    placeholder="Type your response here..."
    style={{ width: "100%", minHeight: 100, padding: "12px 14px", fontSize: 14, lineHeight: 1.6, border: "1px solid #e2e6ed", borderRadius: 8, resize: "vertical", fontFamily: "inherit", background: "#f8f9fb", color: "#1a1a2e", outline: "none" }}
  />
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ fontSize: 11, color: "#6b7280" }}>Enter to send · Shift+Enter for new line</div>
    <button onClick={onSend} disabled={aiTyping} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Send →</button>
  </div>
</div>
  );
}

// ── DEBRIEF VIEW ──────────────────────────────────────────────────
function DebriefView({ debrief, loading, sim, onReset }) {
  if (loading) {
    return (
      <div style={{ padding: "3rem 0", textAlign: "center" }}>
        <div style={{ fontSize: 14, color: "var(--muted)", marginBottom: 12 }}>Analysing your meeting performance...</div>
        <div style={{ width: 28, height: 28, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
      </div>
    );
  }

  if (!debrief || debrief.error) {
    return (
      <div style={{ padding: "2rem 0" }}>
        <div style={s.errorBox}>{debrief?.error || "Could not generate debrief."}</div>
        <button style={{ ...s.btnPrimary, marginTop: 12 }} onClick={onReset}>↺ Try again</button>
      </div>
    );
  }

  const sc = scoreColor(debrief.overallScore);
  const scoreLabels = { discovery: "Discovery", businessAcumen: "Business acumen", questionQuality: "Question quality", objectionHandling: "Objection handling", executivePresence: "Executive presence" };
  const lowest = Object.entries(debrief.scores || {}).sort((a, b) => a[1] - b[1])[0];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Meeting debrief</div>
        <button style={s.btnSecondary} onClick={onReset}>↺ New simulation</button>
      </div>

      {/* Score card */}
      <div style={{ ...s.scoreCard, background: sc.bg, borderColor: sc.border }}>
        <div style={{ textAlign: "center", flexShrink: 0, paddingRight: 20, borderRight: `1px solid ${sc.border}` }}>
          <div style={{ fontSize: 52, fontWeight: 600, color: sc.text, lineHeight: 1 }}>{debrief.overallScore}</div>
          <div style={{ fontSize: 11, color: sc.text, opacity: 0.7, letterSpacing: "0.08em", marginTop: 2 }}>SCORE</div>
        </div>
        <div style={{ flex: 1, paddingLeft: 20 }}>
          <div style={{ fontSize: 14, fontStyle: "italic", color: sc.text, marginBottom: 12, lineHeight: 1.5 }}>"{debrief.verdict}"</div>
          {Object.entries(debrief.scores || {}).map(([k, v]) => {
            const c = scoreColor(v);
            return (
              <div key={k} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>
                  <span>{scoreLabels[k] || k}</span>
                  <span style={{ color: c.text, fontWeight: 500 }}>{v}</span>
                </div>
                <div style={{ height: 5, background: "rgba(0,0,0,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: v + "%", background: c.fill, borderRadius: 3, transition: "width 1s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Persona revealed */}
      <div style={s.sectionHead}>Stakeholder persona — revealed</div>
      <div style={s.dCard}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{[sim.role, sim.company].filter(Boolean).join(" · ") || "Your stakeholder"}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{debrief.personaReveal?.personality}</div>
        <div style={{ fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span><strong>Hidden concern:</strong> {debrief.personaReveal?.hiddenConcern}</span>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500, whiteSpace: "nowrap", background: debrief.personaReveal?.wasItFound ? "#EAF3DE" : "#FAEEDA", color: debrief.personaReveal?.wasItFound ? "#27500A" : "#633806" }}>
            {debrief.personaReveal?.wasItFound ? "✓ You found it" : "Undiscovered"}
          </span>
        </div>
      </div>

      {/* Did well */}
      <div style={s.sectionHead}>What you did well</div>
      {(debrief.didWell || []).map((w, i) => (
        <div key={i} style={{ ...s.dCard, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ color: "#3B6D11", fontWeight: 600, flexShrink: 0, marginTop: 1 }}>✓</span>
          <span style={{ fontSize: 13 }}>{w}</span>
        </div>
      ))}

      {/* Missed */}
      <div style={s.sectionHead}>Missed opportunities</div>
      {(debrief.missedOpportunities || []).map((m, i) => (
        <div key={i} style={{ ...s.dCard, display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ color: "#854F0B", flexShrink: 0, marginTop: 1 }}>→</span>
          <span style={{ fontSize: 13 }}>{m}</span>
        </div>
      ))}

      {/* Best question */}
      <div style={s.sectionHead}>The question you should have asked</div>
      <div style={{ ...s.dCard, borderLeft: "3px solid var(--accent-blue)", borderRadius: "0 8px 8px 0", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontStyle: "italic", color: "var(--accent-blue)", lineHeight: 1.6 }}>"{debrief.bestQuestionToAsk}"</div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...s.btnPrimary, flex: 1 }} onClick={onReset}>↺ Try again</button>
        {lowest && (
          <button style={{ ...s.btnSecondary, flex: 1, borderColor: "var(--accent-blue)", color: "var(--accent-blue)", background: "var(--accent-blue-light)" }}
            onClick={() => alert("Connect this to Bucky on SalesMind.Online for coaching tips!")}>
            Get coaching tips →
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 24 }}>
        Copyright © 2026 — SalesMind.Online
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("input");
  const [sim, setSim] = useState({});
  const [conv, setConv] = useState([]);
  const [personaSystem, setPersonaSystem] = useState("");
  const [msgCount, setMsgCount] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [hasContext, setHasContext] = useState(false);
  const [debrief, setDebrief] = useState(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [error, setError] = useState("");
  const chatRef = useRef(null);

  const scrollChat = () => setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 60);

  async function startSim(formData) {
    setSim(formData);
    setConv([]);
    setMsgCount(0);
    setError("");
    setHasContext(false);
    setView("loading");
    setLoadingStep(1);

    try {
      let companyContext = "";

      if (formData.url || formData.company) {
        const q = formData.url
          ? "Fetch and summarise key business information from: " + formData.url
          : "Find recent news, strategy, financials and key challenges for: " + formData.company;

        companyContext = await callClaude({
          messages: [{ role: "user", content: q }],
          system: "You are a business intelligence analyst. Extract: recent news, strategic priorities, financial pressures, tech stack, expansion plans, key challenges, leadership changes. Be concise. Plain text only.",
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          max_tokens: 600,
        });
        setHasContext(true);
      }

      setLoadingStep(2);

      let ctx = "";
      if (formData.company) ctx += "Company: " + formData.company + "\n";
      if (formData.role) ctx += "Stakeholder role: " + formData.role + "\n";
      if (formData.objective) ctx += "Meeting type: " + formData.objective + "\n";
      if (formData.stage) ctx += "Deal stage: " + formData.stage + "\n";
      if (formData.product) ctx += "Product being sold: " + formData.product + "\n";
      if (formData.competitors) ctx += "Competitors: " + formData.competitors + "\n";
      if (formData.challenges) ctx += "Known context: " + formData.challenges + "\n";
      if (companyContext) ctx += "\nLive company intelligence:\n" + companyContext;

      const persona = await callClaude({
        messages: [{ role: "user", content: "Build a roleplay system prompt for this B2B meeting:\n\n" + ctx + "\n\nWrite a plain text system prompt to roleplay AS this stakeholder. Include: personality type (pick one: skeptical/cautious, data-driven, relationship-focused, impatient/results-driven), one hidden concern the rep must discover through good questions, 2-3 KPIs they care about, their attitude toward new vendors, and behavioral rules for the roleplay. Be specific." }],
        system: "You build realistic B2B buyer personas for sales training simulations. Return plain text only — no JSON, no markdown headers.",
        max_tokens: 500,
      });

      setPersonaSystem(persona);
      setLoadingStep(3);

      const fullSys = persona + "\n\nCRITICAL RULES:\n- Stay in character at all times. Never reveal you are an AI.\n- Keep responses to 2-5 sentences like a real busy executive.\n- Ask one probing question back at the rep per turn.\n- If the rep pitches features without discovering needs first, push back or deflect.\n- If the rep asks great discovery questions, reward them with useful intel.\n- Give objections that feel genuine and specific.\n- Be politely guarded — not hostile, not a pushover.";

      const opening = await callClaude({
        messages: [{ role: "user", content: "Begin the meeting now. Give a brief, realistic greeting as this stakeholder. Mention you have a packed schedule and ask what the rep is here to cover today." }],
        system: fullSys,
        max_tokens: 150,
      });

      setConv([{ role: "assistant", content: opening }]);
      setView("chat");
      scrollChat();
    } catch (e) {
      setError(e.message || "Could not start simulation. Check your API key in Vercel.");
      setView("input");
    }
  }

  async function sendMsg() {
    if (!userInput.trim() || aiTyping) return;
    const msg = userInput.trim();
    setUserInput("");
    const newConv = [...conv, { role: "user", content: msg }];
    setConv(newConv);
    setMsgCount(c => c + 1);
    setAiTyping(true);
    scrollChat();

    const fullSys = personaSystem + "\n\nCRITICAL RULES:\n- Stay in character at all times. Never reveal you are an AI.\n- Keep responses to 2-5 sentences like a real busy executive.\n- Ask one probing question back per turn.\n- If rep pitches without discovering, push back.\n- If great questions, give useful intel.\n- Be politely guarded — not hostile.";

    try {
      const reply = await callClaude({ messages: newConv, system: fullSys, max_tokens: 250 });
      setConv([...newConv, { role: "assistant", content: reply }]);
    } catch (e) {
      setConv([...newConv, { role: "assistant", content: "Connection error: " + (e.message || "Check API key.") }]);
    } finally {
      setAiTyping(false);
      scrollChat();
    }
  }

  async function endSim() {
    if (conv.length < 2) { alert("Have at least one exchange before debriefing!"); return; }
    setView("debrief");
    setDebriefLoading(true);
    setDebrief(null);

    const transcript = conv.map(m => (m.role === "user" ? "REP: " : "STAKEHOLDER: ") + m.content).join("\n\n");
    const ctx = `Company: ${sim.company || "unknown"}\nRole: ${sim.role || "unknown"}\nObjective: ${sim.objective}\nStage: ${sim.stage}\nProduct: ${sim.product || "unknown"}`;

    try {
      const result = await callClaude({
        messages: [{ role: "user", content: `Debrief this B2B sales roleplay meeting.\n\nCONTEXT:\n${ctx}\n\nTRANSCRIPT:\n${transcript}\n\nReturn ONLY valid JSON — no markdown, no backticks:\n{"overallScore":<0-100>,"scores":{"discovery":<0-100>,"businessAcumen":<0-100>,"questionQuality":<0-100>,"objectionHandling":<0-100>,"executivePresence":<0-100>},"personaReveal":{"personality":"<buyer type>","hiddenConcern":"<the hidden concern>","wasItFound":<true or false>},"didWell":["<specific point>","<specific point>","<specific point>"],"missedOpportunities":["<specific missed moment>","<specific missed moment>"],"bestQuestionToAsk":"<the one question they should have asked but didn't>","verdict":"<one honest coaching sentence>"}` }],
        system: "You are a brutally honest but constructive B2B sales coach with 20+ years experience. Analyse meeting transcripts and give specific, actionable coaching feedback. Respond ONLY with valid JSON — no markdown, no backticks.",
        max_tokens: 900,
      });

      const clean = result.replace(/```json|```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse debrief response.");
      setDebrief(JSON.parse(match[0]));
    } catch (e) {
      setDebrief({ error: e.message || "Parse error" });
    } finally {
      setDebriefLoading(false);
    }
  }

  function reset() {
    setView("input");
    setConv([]);
    setSim({});
    setMsgCount(0);
    setDebrief(null);
    setPersonaSystem("");
    setHasContext(false);
    setUserInput("");
    setError("");
  }

  return (
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <a href="https://salesmind.online" style={{ textDecoration: "none" }}>
              <div style={s.logo}>SalesMind<span style={{ color: "var(--accent-blue)" }}>.Online</span></div>
            </a>
            <div style={s.logoSub}>Meeting Prep Simulator</div>
          </div>
          {view === "chat" && (
            <button style={s.btnDanger} onClick={endSim}>🏁 End &amp; debrief</button>
          )}
        </div>
      </header>

      {/* Hero — only on input view */}
      {view === "input" && (
        <div style={s.hero}>
          <div style={s.heroTag}>AI-POWERED SALES TRAINING</div>
          <h1 style={s.heroTitle}>Practice before<br />the real meeting.</h1>
          <p style={s.heroDesc}>Enter your deal details and simulate a realistic conversation with an AI-generated stakeholder. Get scored, debriefed, and coached — before it counts.</p>
        </div>
      )}

      {/* Main content */}
      <main style={s.main}>
        <div style={s.card}>
          {view === "input" && <InputForm onStart={startSim} error={error} />}
          {view === "loading" && <LoadingView step={loadingStep} company={sim.company} />}
          {view === "chat" && <ChatView sim={sim} conv={conv} msgCount={msgCount} aiTyping={aiTyping} userInput={userInput} setUserInput={setUserInput} onSend={sendMsg} onEnd={endSim} hasContext={hasContext} chatRef={chatRef} />}
          {view === "debrief" && <DebriefView debrief={debrief} loading={debriefLoading} sim={sim} onReset={reset} />}
        </div>
      </main>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────
const s = {
  app: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8f9fb" },
  header: { background: "#fff", borderBottom: "1px solid var(--border)", padding: "14px 24px" },
  headerInner: { maxWidth: 760, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: 20, fontWeight: 700, color: "var(--text)" },
  logoSub: { fontSize: 11, color: "var(--muted)", marginTop: 1, letterSpacing: "0.04em" },
  hero: { maxWidth: 760, margin: "0 auto", padding: "48px 24px 32px" },
  heroTag: { fontSize: 11, fontWeight: 600, color: "var(--accent-blue)", letterSpacing: "0.1em", marginBottom: 12 },
  heroTitle: { fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, lineHeight: 1.15, marginBottom: 14, color: "var(--text)" },
  heroDesc: { fontSize: 15, color: "var(--muted)", lineHeight: 1.75, maxWidth: 480 },
  main: { maxWidth: 760, margin: "0 auto", padding: "0 24px 60px", flex: 1, width: "100%" },
  card: { background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" },
  formWrap: {},
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 },
  btnPrimary: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px 24px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" },
  btnSecondary: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "var(--text)" },
  btnDanger: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#A32D2D" },
  errorBox: { padding: "10px 14px", background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 8, fontSize: 13, color: "#A32D2D", marginBottom: 12 },
  chatHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" },
  livePill: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#EAF3DE", border: "1px solid #c0dd97", color: "#27500A", fontWeight: 500 },
  chatBox: { minHeight: 280, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", padding: "4px 0", marginBottom: 12 },
  bubble: { padding: "10px 14px", borderRadius: 10, maxWidth: "88%", marginBottom: 8 },
  bubbleAI: { background: "var(--surface)", border: "1px solid var(--border)", alignSelf: "flex-start" },
  bubbleUser: { background: "var(--accent-blue-light)", border: "1px solid #c5d9f8", alignSelf: "flex-end" },
  bubbleRole: { fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.08em", marginBottom: 4 },
  scoreCard: { display: "flex", alignItems: "flex-start", gap: 0, border: "1px solid", borderRadius: 12, padding: "20px 24px", marginBottom: 16 },
  sectionHead: { fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "18px 0 10px" },
  dCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 8 },
};
