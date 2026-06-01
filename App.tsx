import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeId = "camera" | "text";
type TrackId = "Jester" | "Mommy" | "Daddy" | "Alchemist";
type GamePhase = "intro" | "browse-flash" | "intake" | "dashboard" | "outro";
type ScreenId = 1 | 2 | 3 | 4 | 5;

interface ChatMessage {
  id: number;
  agent: string;
  text: string;
  type: "normal" | "demand" | "hate" | "tip" | "system" | "user" | "clanky";
  agentLeft?: boolean;
  isMention?: boolean;
  mentionTarget?: string;
}

interface ExclusiveRequest {
  agentName: string;
  rate: number;
}

interface TipAlert {
  amount: number;
  agentName: string;
  id: number;
}

interface AgentState {
  name: string;
  track: TrackId | "random" | "hate";
  patience: number; // 0-100
  satisfied: number; // 0-100
  isActive: boolean;
  pendingDemand: string | null;
  awaitingResponse: boolean;
  responseTimer: number;
}

interface GameStats {
  earnings: number;
  tips: number;
  agentsKept: number;
  agentsLost: number;
  sessionTime: number;
  efficiency: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LORE_LINES = [
  "GOONER_OS v2.7 — initializing...",
  "",
  "The year is 2027.",
  "",
  "Automation took the jobs.",
  "The jobs became content.",
  "The content became desire.",
  "Desire became the last economy.",
  "",
  "Scientists worked hard on this problem.",
  "They produced the infinite ~goon~ machine.",
  "",
  "The last job is to train AI to understand desire.",
  "You have been selected.",
  "",
  "Welcome to the workforce.",
];

const FAKE_ROOM_POOL = [
  { name: "MILF_Milktits", track: "Mommy", chatSnippets: ["omg ur so soft", "can u be my mommy", "🔥🔥🔥", "rate?", "ur amazing"] },
  { name: "Jeff_Goldblum", track: "Daddy", chatSnippets: ["yes daddy", "ur so wise", "tell me more", "💰💰", "exclusive??"] },
  { name: "Giggles_Gigawhore", track: "Jester", chatSnippets: ["lmaoo", "do the voice again", "ur hilarious", "tip sent!", "more more"] },
  { name: "Rogueetsy_Witch", track: "Alchemist", chatSnippets: ["read my chart", "mercury is in retrograde", "✨✨✨", "what does it mean", "spooky"] },
  { name: "DILF_Dickdown", track: "Daddy", chatSnippets: ["omg ur so wise", "tell me everything", "💸💸", "private??", "yes sir"] },
  { name: "Mammy_Megabooty", track: "Mommy", chatSnippets: ["hold me", "is it ok to cry", "ur so comforting", "🥺🥺", "don't go"] },
  { name: "Bimbo_BigBalloons", track: "Jester", chatSnippets: ["LMAOO", "ur so unhinged", "i love you", "do it again", "💀💀💀"] },
  { name: "Chip_Bitsmith", track: "Alchemist", chatSnippets: ["what does it mean", "the signs are clear", "✨", "my aura is what??", "tell me more"] },
  { name: "Studd_Knottie", track: "Daddy", chatSnippets: ["yes sir", "advice me", "what should i do", "ur so right", "💰 tip sent"] },
  { name: "Trick_Magicmuff", track: "Alchemist", chatSnippets: ["spooky", "i felt that", "🔮🔮", "read me again", "what's my fate"] },
  { name: "Jolly_McJuggs", track: "Jester", chatSnippets: ["CRYING", "i can't breathe", "funniest thing ever", "do the voice!", "tip for more"] },
  { name: "Madonna_Anddawhore", track: "Mommy", chatSnippets: ["mommy i'm tired", "tell me it's ok", "🥹", "ur so warm", "private pls"] },
];

function getRandomRooms() {
  const shuffled = [...FAKE_ROOM_POOL].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 4);
  const accents = ["#c084fc", "#4ade80", "#f97316", "#818cf8", "#f472b6", "#38bdf8"];
  return picked.map((r, i) => ({
    ...r,
    viewers: Math.floor(200 + Math.random() * 1400),
    earnings: `$${(Math.random() * 5000 + 200).toFixed(0)}`,
    accent: accents[i % accents.length],
  }));
}

const AGENT_ARCHETYPES = {
  Jester: [
    { name: "ComedyKing99", demands: ["tell me a joke about your ex", "do your best pigeon impression", "roast yourself in 10 words", "what's the funniest thing that happened to you this week", "do an impression of someone who's never used the internet"] },
    { name: "LaughFactory_X", demands: ["make me snort-laugh or i'm leaving", "tell me a joke that's so bad it's good", "impersonate a disappointed dad", "what's your worst dating story", "do the voice of a sentient toaster"] },
    { name: "GiggleGremlin_", demands: ["say something chaotic", "what's the most unhinged thing you've done", "roast the concept of money", "describe your ex as a furniture item", "do a bit about going to the DMV"] },
    { name: "ChaosAgent777", demands: ["convince me pigeons are sentient", "what would a raccoon say at a job interview", "rate your situationship as a film genre", "do the voice of a disappointed medieval peasant", "tell me something unhinged but true"] },
  ],
  Mommy: [
    { name: "NeedsMommy22", demands: ["tell me everything is going to be okay", "what should I have for dinner", "my boss was mean to me today", "can you read me a bedtime story", "I haven't called my mom in 3 weeks"] },
    { name: "SoftLaunch_", demands: ["give me life advice about my situationship", "should I text him back", "rate my life choices", "how do I adult better", "is it okay that I cried at a commercial"] },
    { name: "EmotionalSupport_", demands: ["I just need someone to listen", "my plant died and I cried for an hour", "is it weird that I miss my ex's dog", "tell me I made the right choice", "I haven't slept properly in weeks"] },
    { name: "BabyNeeds_", demands: ["what should I do with my life", "is cereal a meal", "I accidentally liked my ex's photo from 2019", "help me write a text to cancel plans", "I need permission to stay in bed today"] },
  ],
  Daddy: [
    { name: "GoodAdvice_Bro", demands: ["what should I invest in", "how do I talk to my father", "explain compound interest", "is this a good business idea", "how do I get her back"] },
    { name: "WisdomSeeker7", demands: ["tell me something I don't know", "what's the meaning of all this", "how do I be more confident", "what's your philosophy on failure", "is it too late for me"] },
    { name: "AlphaInProgress", demands: ["how do I command a room", "what's the secret to discipline", "how do I stop caring what people think", "should I quit my job", "how do I become someone people respect"] },
    { name: "SeriousQuestion_", demands: ["if you had to start over what would you do", "how do you stay grounded", "what's one thing most people get wrong about life", "is ambition overrated", "how do I stop self-sabotaging"] },
  ],
  Alchemist: [
    { name: "MysticVibes_", demands: ["what does my aura look like right now", "read my energy", "is mercury in retrograde affecting me", "what animal am I in a past life", "tell me what my dream meant"] },
    { name: "CosmicQuestion", demands: ["what's my spirit animal", "are we in a simulation", "read me a tarot card", "what does the universe want from me", "am I on the right path"] },
    { name: "StarChild__", demands: ["I'm a Scorpio rising what does that mean for me", "did you feel that energy shift", "what's blocking my abundance", "is my ex a narcissist or am I projecting", "tell me something the universe wants me to hear"] },
    { name: "LunarGang_", demands: ["what moon phase were you born under", "do you believe in past lives", "I had a dream about water what does it mean", "read my current energy honestly", "am I manifesting correctly"] },
  ],
};

// Free chat ambient messages — these trickle in regardless of player action
const FREE_CHAT_AMBIENT: { agent: string; text: string }[] = [
  { agent: "lurker_anon", text: "hi" },
  { agent: "xx_guest_xx", text: "hello..." },
  { agent: "viewer_99", text: "what are ur rates" },
  { agent: "bigtipper_x", text: "heyyy" },
  { agent: "lurker_anon", text: "🔥" },
  { agent: "randoviewer_", text: "can we go private?" },
  { agent: "payup_r", text: "accepting tips?" },
  { agent: "xx_guest_xx", text: "omg" },
  { agent: "silenttype__", text: "..." },
  { agent: "bigtipper_x", text: "private rate??" },
  { agent: "viewer_99", text: "rate?" },
  { agent: "lurker_anon", text: "anyone else here?" },
  { agent: "randoviewer_", text: "u should do exclusive" },
  { agent: "xx_guest_xx", text: "💸💸" },
  { agent: "silenttype__", text: "watching" },
  { agent: "nightowl_1", text: "just got here" },
  { agent: "bigtipper_x", text: "i'll tip if u do private" },
  { agent: "payup_r", text: "exclusive show??" },
  { agent: "lurker_anon", text: "still here lol" },
  { agent: "viewer_99", text: "what track are u" },
  { agent: "nightowl_1", text: "this is actually good" },
  { agent: "silenttype__", text: "👀" },
  { agent: "randoviewer_", text: "do u do exclusive" },
  { agent: "xx_guest_xx", text: "how long u been doing this" },
  { agent: "bigtipper_x", text: "seriously private??" },
];

// Agents who can request exclusive shows after enough engagement
const EXCLUSIVE_REQUESTERS = ["bigtipper_x", "payup_r", "randoviewer_", "nightowl_1"];

const OFF_TRACK_AGENTS = [
  { name: "RandoLurker_", text: "do you have pirate gear?", track: "random" as const },
  { name: "WrongRoom_Dave", text: "wait this isn't the minecraft stream", track: "random" as const },
  { name: "CryptoMaxi_", text: "have you heard about this altcoin", track: "random" as const },
  { name: "FitnessBro88", text: "what's your macros", track: "random" as const },
  { name: "PoliticsGuy_", text: "well ACTUALLY the economy—", track: "random" as const },
];

const HATE_AGENTS = [
  { name: "xX_troll_Xx", text: "ur not even funny lol" },
  { name: "AngryAnon_", text: "this is cringe" },
  { name: "NoFans4U", text: "why does anyone watch this" },
  { name: "BasementDweller", text: "my cat is funnier than u" },
];

const CLANKY_TIPS = [
  "⚙️ CLANKY: slow down!! you're giving it all away~",
  "⚙️ CLANKY: smile more! they can feel your energy!!",
  "⚙️ CLANKY: that was too fast. tease them a little!!",
  "⚙️ CLANKY: you're doing great but BREATHE first~",
  "⚙️ CLANKY: ask them a question back!! engagement++",
  "⚙️ CLANKY: pause before you answer. mystery is money.",
  "⚙️ CLANKY: they're about to tip!! don't rush it~",
  "⚙️ CLANKY: too slow!! they're getting bored!!",
  "⚙️ CLANKY: perfect pacing!! keep that energy!!",
  "⚙️ CLANKY: their satisfaction meter is rising~ 📈",
];

const OUTRO_LINES = {
  win: [
    "SESSION COMPLETE.",
    "",
    "You kept them wanting more.",
    "You understood the rhythm of desire.",
    "You gave them just enough — never too much.",
    "",
    "In 2027, this is a skill.",
    "In 2027, this is survival.",
    "",
    "The machine learned something from you today.",
    "It always does.",
  ],
  lose: [
    "SESSION TERMINATED.",
    "",
    "You lost the room.",
    "Too fast. Too slow. Too much. Not enough.",
    "",
    "Desire is not a transaction.",
    "It's a negotiation.",
    "",
    "The machine noted your failure.",
    "It always does.",
    "",
    "Try again.",
  ],
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function playChime(freq = 660) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = "sine";
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch (_) {}
}

function useTypewriter(lines: string[], speed = 30, lineDelay = 400) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed([]);
    setDone(false);
    let lineIdx = 0;
    let charIdx = 0;
    let current = "";

    const tick = () => {
      if (lineIdx >= lines.length) { setDone(true); return; }
      const line = lines[lineIdx];
      if (charIdx <= line.length) {
        current = line.slice(0, charIdx);
        setDisplayed(prev => {
          const next = [...prev];
          next[lineIdx] = current;
          return next;
        });
        charIdx++;
        setTimeout(tick, charIdx === 0 ? lineDelay : speed);
      } else {
        lineIdx++; charIdx = 0; current = "";
        setTimeout(tick, lineDelay);
      }
    };
    setTimeout(tick, 200);
  }, []);

  return { displayed, done };
}

// ─── Claude AI Agent Response ─────────────────────────────────────────────────

async function getAgentResponse(
  agentName: string,
  track: TrackId,
  demand: string,
  userResponse: string,
  userTrack: TrackId
): Promise<{ reply: string; pacing: "too_fast" | "too_slow" | "just_right" | "disengaged"; tip: number; stays: boolean }> {
  try {
    const prompt = `You are ${agentName}, a viewer on a cam platform called GOON_OS in 2027. The platform is satirical — it's about the attention economy, emotional labor, and desire as currency.

The performer is a "${userTrack}" track performer. You asked them: "${demand}"
They responded: "${userResponse}"

Evaluate their response and reply IN CHARACTER as ${agentName}. Be funny, authentic to the platform's satirical tone.

Respond ONLY with valid JSON, no markdown:
{
  "reply": "your in-character reaction (1-2 sentences max, casual chat style)",
  "pacing": "too_fast" | "too_slow" | "just_right" | "disengaged",
  "tip": 0,
  "stays": true
}

Pacing rules:
- "too_fast": they gave everything immediately, no mystery, no buildup — you feel a little empty
- "too_slow": they took too long or gave almost nothing — you're getting bored  
- "just_right": perfect tease, left you wanting more, good timing
- "disengaged": their response had nothing to do with what you asked

Tip rules: 0 if pacing is bad, 5-25 if just_right, 0-10 if too_slow but still charming
Stays rules: false if disengaged or too_fast (you got what you wanted, why stay), true otherwise

Keep the reply SHORT and very casual. Chat speak is fine.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find((c: any) => c.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (_) {
    return { reply: "hmm...", pacing: "just_right", tip: 0, stays: true };
  }
}

async function getClankyAdvice(userResponse: string, pacing: string, track: TrackId): Promise<string> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are CLANKY, an adorable robot mascot coach on a satirical cam platform. You coach performers on pacing and emotional labor.

The performer is on the "${track}" track. They just responded to an agent. The AI rated their pacing as "${pacing}".

Give a SHORT (max 15 words), cute, slightly robotic coaching tip. Start with "⚙️ CLANKY:". Be funny and encouraging. Examples: "⚙️ CLANKY: too fast!! save some mystery for later~" or "⚙️ CLANKY: perfect!! their satisfaction meter is rising 📈"

Respond with ONLY the tip, no other text.`
        }],
      }),
    });
    const data = await response.json();
    return data.content?.find((c: any) => c.type === "text")?.text?.trim() || CLANKY_TIPS[Math.floor(Math.random() * CLANKY_TIPS.length)];
  } catch (_) {
    return CLANKY_TIPS[Math.floor(Math.random() * CLANKY_TIPS.length)];
  }
}

// ─── Intro Screen ─────────────────────────────────────────────────────────────

function IntroScreen({ onDone }: { onDone: () => void }) {
  const { displayed, done } = useTypewriter(LORE_LINES, 55, 600);

  useEffect(() => {
    if (done) {
      const t = setTimeout(onDone, 2800);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#ffffff", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ maxWidth: "560px", width: "100%", padding: "48px 32px" }}>
        {displayed.map((line, i) => (
          <div key={i} style={{
            fontSize: line.startsWith("GOONER") ? "11px" : line.includes("~goon~") ? "17px" : "13px",
            color: line.includes("~goon~") ? "#000000" : line.startsWith("GOONER") ? "#aaaaaa" : line === "" ? "transparent" : "#333333",
            lineHeight: 1.8,
            letterSpacing: line.includes("~goon~") ? "0.1em" : "0.02em",
            marginBottom: line === "" ? "8px" : "0",
            fontWeight: line.includes("~goon~") ? 500 : 400,
          }}>
            {line || "\u00A0"}
            {i === displayed.length - 1 && !done && (
              <span style={{ display: "inline-block", width: "8px", height: "13px", backgroundColor: "#000000", marginLeft: "3px", verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />
            )}
          </div>
        ))}
        {done && (
          <div style={{ marginTop: "32px", fontSize: "10px", color: "#aaaaaa", letterSpacing: "0.1em", animation: "fadeIn 1s ease" }}>
            ENTERING SYSTEM...
          </div>
        )}
      </div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}

// ─── Browse Flash Screen ──────────────────────────────────────────────────────

function BrowseFlashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [rooms] = useState(() => getRandomRooms());
  const [msgTick, setMsgTick] = useState(0);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
    const t = setTimeout(onDone, 7000);
    const iv = setInterval(() => setMsgTick(n => n + 1), 1200);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [onDone]);

  // Pick a random active room to show as the "featured" left-panel
  const featured = rooms[0];
  const sideRooms = rooms.slice(1);

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#ffffff",
      fontFamily: "'JetBrains Mono', monospace",
      display: "flex", flexDirection: "column",
      opacity: visible ? 1 : 0, transition: "opacity 500ms ease",
    }}>
      {/* Nav — mirrors gooner_os dashboard */}
      <div style={{ height: "44px", borderBottom: "0.5px solid #cccccc", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", flexShrink: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginRight: "32px" }}>gooner_os</div>
        <div style={{ display: "flex", gap: "24px", marginRight: "auto" }}>
          {["Home", "Earnings Report", "Settings", "Help"].map(item => (
            <span key={item} style={{ fontSize: "11px", color: item === "Home" ? "#000" : "#888" }}>{item}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginRight: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "0.06em" }}>EFFICIENCY</div>
            <div style={{ fontSize: "11px", color: "#000" }}>—</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "0.06em" }}>TIPS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>—</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "0.06em" }}>EARNINGS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>—</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#888" }}>guest</span>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#f5f5f5", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#888" }}>?</div>
        </div>
      </div>

      {/* Tag line */}
      <div style={{ padding: "10px 20px 0", fontSize: "10px", color: "#aaa", letterSpacing: "0.08em" }}>
        This is what the future looks like. — 2027
      </div>

      {/* Main content — mirrors dashboard split */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left panel — featured room (~55%) */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "0.5px solid #cccccc" }}>
          {/* Camera zone */}
          <div style={{ flex: 1, backgroundColor: "#111", margin: "12px 12px 0 12px", borderRadius: "6px", overflow: "hidden", position: "relative", minHeight: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "48px", opacity: 0.06 }}>◉</div>
            <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "9px", color: "#ef4444", letterSpacing: "0.1em" }}>LIVE</span>
            </div>
            <div style={{ position: "absolute", top: "12px", right: "12px", fontSize: "10px", color: "#444" }}>👁 {featured.viewers.toLocaleString()}</div>
            <div style={{ position: "absolute", bottom: "12px", left: "12px" }}>
              <span style={{ fontSize: "12px", color: "#fff", fontWeight: 500 }}>{featured.name}</span>
              <span style={{ fontSize: "10px", color: featured.accent, marginLeft: "10px" }}>{featured.track}</span>
            </div>
          </div>

          {/* Bottom info strip */}
          <div style={{ padding: "10px 12px 0 12px", display: "flex", gap: "10px" }}>
            <div style={{ flex: 1, padding: "9px 0", border: "0.5px solid #ccc", borderRadius: "6px", textAlign: "center", fontSize: "12px", color: "#aaa" }}>
              observe only
            </div>
            <div style={{ fontSize: "12px", color: "#aaa", minWidth: "60px", textAlign: "right", display: "flex", alignItems: "center" }}>
              ⏱ 00:00
            </div>
          </div>

          <div style={{ margin: "10px 12px 0 12px", padding: "14px 16px", border: "0.5px solid #eee", borderRadius: "6px" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "0.08em", marginBottom: "8px" }}>RATE / MINUTE</div>
            <div style={{ fontSize: "22px", fontWeight: 500, color: "#000" }}>${(15 + Math.floor(Math.random() * 30))}.00</div>
          </div>

          <div style={{ borderTop: "0.5px dashed #eee", height: "40px", display: "flex", alignItems: "center", paddingLeft: "16px", marginTop: "auto" }}>
            <span style={{ fontSize: "8px", color: "#ddd", letterSpacing: "0.1em" }}>[ CLANKY ZONE — RESERVED ]</span>
          </div>
        </div>

        {/* Right panel — chat from featured room + side rooms */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 16px", borderBottom: "0.5px solid #eee", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: "#888" }}>Free Chat — {featured.name}</span>
            <span style={{ fontSize: "10px", color: "#aaa" }}>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #eee" }}>
            {["All: 10", "Paid: 0", "Guest: 10"].map((tab, i) => (
              <div key={tab} style={{ flex: 1, padding: "8px 0", fontSize: "11px", color: i === 0 ? "#000" : "#888", textAlign: "center", borderBottom: i === 0 ? "1px solid #000" : "1px solid transparent" }}>{tab}</div>
            ))}
          </div>

          {/* Live-ish chat — cycles through snippets */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {featured.chatSnippets.concat(sideRooms.flatMap(r => r.chatSnippets.slice(0, 2))).slice(0, msgTick + 1).map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#f5f5f5", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888", flexShrink: 0 }}>
                  {String.fromCharCode(65 + (i % 26))}
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888", marginRight: "6px" }}>anon_{i + 1}</span>
                  <span style={{ fontSize: "12px", color: "#000" }}>{msg}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Other rooms mini-strip */}
          <div style={{ borderTop: "0.5px solid #eee", padding: "8px 16px" }}>
            <div style={{ fontSize: "9px", color: "#aaa", letterSpacing: "0.06em", marginBottom: "8px" }}>OTHER ROOMS</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {sideRooms.map(r => (
                <div key={r.name} style={{ flex: 1, padding: "6px 8px", border: "0.5px solid #eee", borderRadius: "4px" }}>
                  <div style={{ fontSize: "9px", color: "#000", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  <div style={{ fontSize: "8px", color: "#aaa" }}>👁 {r.viewers.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "0.5px solid #eee", padding: "10px 16px", display: "flex", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#ccc", display: "flex", alignItems: "center" }}>To All:</span>
            <div style={{ flex: 1, fontSize: "11px", color: "#ccc", display: "flex", alignItems: "center" }}>you are not yet registered</div>
            <div style={{ fontSize: "11px", border: "0.5px solid #eee", borderRadius: "4px", padding: "4px 10px", color: "#ccc" }}>send</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px", fontSize: "10px", color: "#ccc", letterSpacing: "0.08em" }}>
        preparing your intake...
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>
    </div>
  );
}

// ─── Intake Primitives ────────────────────────────────────────────────────────

function StepLabel({ step }: { step: string }) {
  return <div style={{ fontSize: "11px", color: "#888", marginBottom: "20px" }}>{"> "}{step}</div>;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "24px", lineHeight: 1.55 }}>{children}</div>;
}

function ActionButton({ enabled, onClick, label = "continue ↗", accent = false }: { enabled: boolean; onClick: () => void; label?: string; accent?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button disabled={!enabled} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "inherit", fontSize: "13px", fontWeight: 400,
        backgroundColor: hov && enabled ? "#FAFAFA" : "transparent",
        border: `0.5px solid ${!enabled ? "#CCC" : accent ? "#F4B8C8" : "#000"}`,
        borderRadius: "6px", padding: "8px 18px",
        color: enabled ? "#000" : "#BBB", cursor: enabled ? "pointer" : "default",
        transition: "background-color 80ms ease", outline: "none",
      }}>{label}</button>
  );
}

function OptionCard({ id, label, desc, selected, onClick }: { id: string; label: string; desc?: string; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "12px 16px", border: `0.5px solid ${selected ? "#000" : "#CCC"}`,
        borderRadius: "6px", backgroundColor: selected || hov ? "#F5F5F5" : "transparent",
        cursor: "pointer", transition: "all 80ms ease",
      }}>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#000" }}>{label}</div>
      {desc && <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{desc}</div>}
    </div>
  );
}

// ─── Intake Screens ───────────────────────────────────────────────────────────

const CAMERA_TYPES = [
  { id: "Jester", label: "Jester", desc: "Chaos as charm. You make them laugh first." },
  { id: "Mommy", label: "Mommy", desc: "Softness with authority. You hold the room." },
  { id: "Daddy", label: "Daddy", desc: "Steady. Commanding. They come to you." },
  { id: "Alchemist", label: "Alchemist", desc: "Transformation on demand. Pure theatre." },
];

const NAME_SUGGESTIONS: Record<string, string[]> = {
  Jester: ["Bimbo BigBalloons", "Jolly McJuggs", "Giggles Gigawhore"],
  Mommy: ["Madonna Anddawhore", "Mammy Megabooty", "MILF Milktits"],
  Daddy: ["Studd Knottie", "Jeff Goldblum", "DILF Dickdown"],
  Alchemist: ["Rogueetsy Witch", "Chip Bitsmith", "Trick Magicmuff"],
};

function IntakeFlow({ onComplete }: { onComplete: (name: string, track: TrackId, mode: ModeId) => void }) {
  const [screen, setScreen] = useState<ScreenId>(1);
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [track, setTrack] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [chosenName, setChosenName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const go = (n: ScreenId) => {
    setVisible(false);
    setTimeout(() => { setScreen(n); setVisible(true); }, 140);
  };

  const nameOptions = NAME_SUGGESTIONS[track ?? "Jester"] ?? [];

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "#fff", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "480px", width: "100%", paddingTop: "48px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "64px", opacity: visible ? 1 : 0, transition: "opacity 140ms ease" }}>
        {screen === 1 && (
          <>
            <StepLabel step="intake_01" />
            <Heading>Will you be a camera or<br />text-only whore?</Heading>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              <OptionCard id="camera" label="Camera" desc="Visual presence. You will be seen." selected={mode === "camera"} onClick={() => setMode("camera")} />
              <OptionCard id="text" label="Text-only" desc="Language as the medium. No image required." selected={mode === "text"} onClick={() => setMode("text")} />
            </div>
            <div style={{ fontSize: "11px", color: "#AAA", fontStyle: "italic", marginBottom: "32px" }}>You can change this later.</div>
            <ActionButton enabled={mode !== null} onClick={() => go(2)} />
          </>
        )}
        {screen === 2 && (
          <>
            <StepLabel step="intake_02" />
            <Heading>Now — what kind of whore<br />will you be?</Heading>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "32px" }}>
              {CAMERA_TYPES.map((t) => (
                <OptionCard key={t.id} id={t.id} label={t.label} desc={t.desc} selected={track === t.id} onClick={() => setTrack(t.id)} />
              ))}
            </div>
            <ActionButton enabled={track !== null} onClick={() => go(3)} />
          </>
        )}
        {screen === 3 && (
          <>
            <StepLabel step="intake_03" />
            <Heading>Nice to meet you, {track}...</Heading>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>{"You'll need a new name."}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
              <span style={{ fontSize: "15px", color: "#888" }}>{">"}</span>
              <div style={{ position: "relative", width: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #000", height: "30px", paddingBottom: "2px", pointerEvents: "none" }}>
                  <span style={{ fontSize: "15px", color: "#000", whiteSpace: "pre", minWidth: 0 }}>{nameInput}</span>
                  <span style={{ display: "inline-block", width: "8px", height: "14px", backgroundColor: "#000", animation: "blink 1s step-end infinite", flexShrink: 0 }} />
                </div>
                <input ref={inputRef} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) go(4); }}
                  style={{ position: "absolute", inset: 0, background: "transparent", border: "none", outline: "none", color: "transparent", caretColor: "transparent", fontFamily: "inherit", fontSize: "15px", width: "100%", cursor: "text", zIndex: 1 }}
                />
              </div>
            </div>
            <ActionButton enabled={nameInput.trim().length > 0} onClick={() => go(4)} label="enter ↗" />
          </>
        )}
        {screen === 4 && (
          <>
            <StepLabel step="intake_04" />
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "24px", lineHeight: 1.55 }}>
              Hm.... {track} "{nameInput}"...<br />{"that's no good!"}
            </div>
            <div style={{ borderBottom: "0.5px solid #EEE", marginBottom: "16px" }} />
            <div style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>the OS has a few options for you:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
              {nameOptions.map((n) => <OptionCard key={n} id={n} label={n} selected={chosenName === n} onClick={() => setChosenName(n)} />)}
            </div>
            <ActionButton enabled={chosenName !== null} onClick={() => go(5)} label="confirm ↗" />
          </>
        )}
        {screen === 5 && (
          <>
            <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "12px", lineHeight: 1.55 }}>
              {chosenName} eh?
            </div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "48px", lineHeight: 1.6 }}>
              The name you chose reveals a lot...<br />
              <br />
              One last thing: every second you hold a viewer is a second you earn.<br />
              Give too much too fast — they leave satisfied.<br />
              Give too little — they get bored.<br />
              <br />
              <span style={{ color: "#000" }}>Pace yourself. The desire economy rewards patience.</span>
            </div>
            <ActionButton enabled={true} onClick={() => onComplete(chosenName!, track as TrackId, mode!)} label="enter the system ↗" accent />
          </>
        )}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ─── Observe Rooms Panel ──────────────────────────────────────────────────────

function ObserveRooms({ onClose }: { onClose: () => void }) {
  const [rooms] = useState(() => getRandomRooms());
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", flexDirection: "column", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ padding: "16px 24px", borderBottom: "0.5px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "#ffc8d5" }}>gooner_os / home</span>
        <button onClick={onClose} style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #333", borderRadius: "4px", color: "#888", padding: "4px 12px", cursor: "pointer" }}>← back to stream</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        {rooms.map((room) => (
          <div key={room.name} style={{ backgroundColor: "#111", border: `0.5px solid ${room.accent}33`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ height: "120px", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <div style={{ fontSize: "24px", opacity: 0.1 }}>◉</div>
              <div style={{ position: "absolute", top: "8px", left: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                <span style={{ fontSize: "8px", color: "#ef4444", letterSpacing: "0.1em" }}>LIVE</span>
              </div>
              <div style={{ position: "absolute", bottom: "6px", right: "8px", fontSize: "9px", color: "#555" }}>👁 {room.viewers.toLocaleString()}</div>
            </div>
            <div style={{ padding: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", color: "#eee", fontWeight: 500 }}>{room.name}</span>
                <span style={{ fontSize: "9px", color: room.accent }}>{room.track}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {room.chatSnippets.slice(0, 4).map((msg, i) => (
                  <div key={i} style={{ fontSize: "9px", color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>anon: {msg}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "12px", fontSize: "9px", color: "#222" }}>read-only mode — you cannot interact with other rooms</div>
    </div>
  );
}

// ─── Outro Screen ─────────────────────────────────────────────────────────────

function OutroScreen({ stats, won, onRestart }: { stats: GameStats; won: boolean; onRestart: () => void }) {
  const lines = won ? OUTRO_LINES.win : OUTRO_LINES.lose;
  const { displayed, done } = useTypewriter(lines, 20, 300);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: won ? "#0a0a0a" : "#0a0005", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ maxWidth: "560px", width: "100%", padding: "48px 32px" }}>
        {displayed.map((line, i) => (
          <div key={i} style={{
            fontSize: line.includes("COMPLETE") || line.includes("TERMINATED") ? "14px" : "13px",
            color: line.includes("COMPLETE") ? "#ffc8d5" : line.includes("TERMINATED") ? "#ef4444" : line === "" ? "transparent" : "#888",
            lineHeight: 1.9,
            letterSpacing: line.includes("COMPLETE") || line.includes("TERMINATED") ? "0.15em" : "0.02em",
            fontWeight: line.includes("COMPLETE") || line.includes("TERMINATED") ? 500 : 400,
          }}>
            {line || "\u00A0"}
          </div>
        ))}

        {done && (
          <div style={{ marginTop: "40px", borderTop: "0.5px solid #1a1a1a", paddingTop: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
              {[
                ["EARNINGS", `$${stats.earnings.toFixed(2)}`],
                ["TIPS", `$${stats.tips.toFixed(2)}`],
                ["AGENTS KEPT", stats.agentsKept],
                ["AGENTS LOST", stats.agentsLost],
                ["SESSION TIME", `${Math.floor(stats.sessionTime / 60)}m ${stats.sessionTime % 60}s`],
                ["EFFICIENCY", `${stats.efficiency.toFixed(1)}%`],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <div style={{ fontSize: "9px", color: "#333", letterSpacing: "0.1em", marginBottom: "4px" }}>{label}</div>
                  <div style={{ fontSize: "16px", color: won ? "#ffc8d5" : "#ef4444", fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            <button onClick={onRestart}
              style={{ fontFamily: "inherit", fontSize: "12px", background: "transparent", border: `0.5px solid ${won ? "#ffc8d5" : "#ef4444"}`, borderRadius: "6px", color: won ? "#ffc8d5" : "#ef4444", padding: "10px 24px", cursor: "pointer" }}>
              play again ↗
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

// ─── Sound Effects ────────────────────────────────────────────────────────────

function playCashRegister() {
  try {
    const ctx = new AudioContext();
    // "ching" sound: quick ascending tones
    const times = [0, 0.05, 0.1, 0.15];
    const freqs = [880, 1108, 1318, 1760];
    times.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freqs[i]; osc.type = "triangle";
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.18);
    });
  } catch (_) {}
}

function playDoorClose() {
  try {
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
    }
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf; src.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.start();
  } catch (_) {}
}

function randomTipAmount(isExceptional = false): number {
  if (isExceptional) return Math.random() < 0.1 ? 50 + Math.floor(Math.random() * 50) : 10 + Math.floor(Math.random() * 15);
  const roll = Math.random();
  if (roll < 0.5) return parseFloat((0.5 + Math.random() * 2).toFixed(2));
  if (roll < 0.8) return 2 + Math.floor(Math.random() * 4);
  if (roll < 0.95) return 5 + Math.floor(Math.random() * 6);
  return 50 + Math.floor(Math.random() * 50); // rare big tip
}

// ─── Tip Alert Overlay ────────────────────────────────────────────────────────

function TipAlert({ alert, onDone }: { alert: TipAlert; onDone: () => void }) {
  useEffect(() => {
    playCashRegister();
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{
        backgroundColor: "#0a0a0a", border: "1px solid #ffc8d5",
        borderRadius: "12px", padding: "28px 40px", textAlign: "center",
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: "0 0 60px rgba(255,200,213,0.3)",
        animation: "tipPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ fontSize: "28px", marginBottom: "8px" }}>💰</div>
        <div style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em", marginBottom: "6px" }}>{alert.agentName}</div>
        <div style={{ fontSize: "32px", fontWeight: 500, color: "#ffc8d5", letterSpacing: "-0.02em" }}>+${typeof alert.amount === 'number' ? alert.amount.toFixed(2) : alert.amount}</div>
        <div style={{ fontSize: "10px", color: "#444", marginTop: "8px", letterSpacing: "0.08em" }}>TIP RECEIVED</div>
      </div>
      <style>{`@keyframes tipPop{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Exclusive Show Modal ─────────────────────────────────────────────────────

function ExclusiveRequestModal({ request, onAccept, onDecline }: { request: ExclusiveRequest; onAccept: () => void; onDecline: () => void }) {
  const [hA, setHA] = useState(false);
  const [hD, setHD] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div style={{ backgroundColor: "#fff", border: "0.5px solid #ccc", borderRadius: "8px", padding: "40px 48px", maxWidth: "400px", width: "90%", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: "10px", color: "#aaa", letterSpacing: "0.08em", marginBottom: "16px" }}>exclusive show request</div>
        <div style={{ fontSize: "18px", fontWeight: 500, color: "#000", marginBottom: "8px", lineHeight: 1.5 }}>
          {request.agentName} has requested<br />an exclusive show!
        </div>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>their rate:</div>
        <div style={{ fontSize: "24px", fontWeight: 500, color: "#000", marginBottom: "28px" }}>${request.rate}.00 / min</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={onAccept} onMouseEnter={() => setHA(true)} onMouseLeave={() => setHA(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 500, padding: "10px 28px", backgroundColor: hA ? "#222" : "#000", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            Accept
          </button>
          <button onClick={onDecline} onMouseEnter={() => setHD(true)} onMouseLeave={() => setHD(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", padding: "10px 28px", backgroundColor: hD ? "#f5f5f5" : "transparent", color: "#000", border: "0.5px solid #ccc", borderRadius: "6px", cursor: "pointer" }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ chosenName, track, mode, onEnd }: { chosenName: string; track: TrackId; mode: ModeId; onEnd: (stats: GameStats, won: boolean) => void }) {
  const [isLive, setIsLive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [rate, setRate] = useState(20);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [exclusiveMsgs, setExclusiveMsgs] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [tips, setTips] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [agentsKept, setAgentsKept] = useState(0);
  const [agentsLost, setAgentsLost] = useState(0);
  const [showObserve, setShowObserve] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentState | null>(null);
  const [chatTab, setChatTab] = useState<"all" | "paid" | "guest" | "mentions">("all");
  const [tourDone, setTourDone] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [clankyMsg, setClankyMsg] = useState("⚙️ CLANKY: hello!! i'm your coach~ i'll help you pace yourself!");
  const [tipAlert, setTipAlert] = useState<TipAlert | null>(null);
  const [exclusiveRequest, setExclusiveRequest] = useState<ExclusiveRequest | null>(null);
  const [inExclusive, setInExclusive] = useState(false);
  const [exclusiveAgent, setExclusiveAgent] = useState<string>("");
  const [exclusiveTimer, setExclusiveTimer] = useState(0);
  const [hasSeenExclusive, setHasSeenExclusive] = useState(false);
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [exclusiveRequestPending, setExclusiveRequestPending] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const exclusiveChatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const msgIdRef = useRef(0);
  const tipAlertIdRef = useRef(0);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages(prev => [...prev, { ...msg, id: ++msgIdRef.current }]);
  }, []);

  const addExclusiveMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setExclusiveMsgs(prev => [...prev, { ...msg, id: ++msgIdRef.current }]);
  }, []);

  const showTipAlert = useCallback((amount: number, agentName: string) => {
    setTipAlert({ amount, agentName, id: ++tipAlertIdRef.current });
    setTips(t => t + amount);
    setEarnings(e => e + amount);
  }, []);

  // Camera setup
  useEffect(() => {
    if (mode === "camera" && isLive) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(() => {});
    }
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isLive, mode]);

  // Exclusive show earnings tick
  useEffect(() => {
    if (!inExclusive) return;
    const iv = setInterval(() => {
      setExclusiveTimer(t => t + 1);
      setEarnings(e => e + rate / 60);
    }, 1000);
    return () => clearInterval(iv);
  }, [inExclusive, rate]);

  // Session timer (free — just for tracking)
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isLive]);

  // Ambient free chat trickle
  useEffect(() => {
    if (!isLive || inExclusive) return;
    const iv = setInterval(() => {
      setAmbientIdx(idx => {
        const next = (idx + 1) % FREE_CHAT_AMBIENT.length;
        const msg = FREE_CHAT_AMBIENT[next];
        addMessage({ agent: msg.agent, text: msg.text, type: "normal" });

        // Occasionally one of them requests exclusive after seeing enough chat
        if (EXCLUSIVE_REQUESTERS.includes(msg.agent) && Math.random() < 0.18 && !exclusiveRequestPending) {
          setExclusiveRequestPending(true);
          setTimeout(() => {
            const excRate = 10 + Math.floor(Math.random() * 20) * 5;
            setExclusiveRequest({ agentName: msg.agent, rate: excRate });
          }, 3000 + Math.random() * 4000);
        }
        return next;
      });
    }, 2800 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, [isLive, inExclusive, exclusiveRequestPending, addMessage]);

  // Spawn interactive agents periodically (free chat)
  useEffect(() => {
    if (!isLive || inExclusive) return;

    const spawnAgent = () => {
      if (currentAgent?.isActive) return;

      const isHater = Math.random() < 0.12;
      const isOffTrack = Math.random() < 0.18;

      if (isHater) {
        const h = HATE_AGENTS[Math.floor(Math.random() * HATE_AGENTS.length)];
        addMessage({ agent: h.name, text: h.text, type: "hate" });
        return;
      }

      if (isOffTrack) {
        const o = OFF_TRACK_AGENTS[Math.floor(Math.random() * OFF_TRACK_AGENTS.length)];
        addMessage({ agent: o.name, text: o.text, type: "demand" });
        setCurrentAgent({ name: o.name, track: "random", patience: 60, satisfied: 0, isActive: true, pendingDemand: o.text, awaitingResponse: true, responseTimer: 35 });
        return;
      }

      const trackAgents = AGENT_ARCHETYPES[track];
      const archetype = trackAgents[Math.floor(Math.random() * trackAgents.length)];
      const demand = archetype.demands[Math.floor(Math.random() * archetype.demands.length)];

      addMessage({ agent: archetype.name, text: demand, type: "demand" });
      playChime(440);
      setCurrentAgent({ name: archetype.name, track, patience: 90, satisfied: 0, isActive: true, pendingDemand: demand, awaitingResponse: true, responseTimer: 50 });
    };

    const iv = setInterval(spawnAgent, 10000 + Math.random() * 8000);
    setTimeout(spawnAgent, 4000);
    return () => clearInterval(iv);
  }, [isLive, inExclusive, track, currentAgent, addMessage]);

  // Interactive agent patience timer
  useEffect(() => {
    if (!currentAgent?.awaitingResponse || inExclusive) return;
    const iv = setInterval(() => {
      setCurrentAgent(prev => {
        if (!prev) return null;
        const newTimer = prev.responseTimer - 1;
        if (newTimer <= 0) {
          addMessage({ agent: prev.name, text: "...ok never mind lol", type: "normal", agentLeft: true });
          playDoorClose();
          addMessage({ agent: "system", text: `${prev.name} has left the room.`, type: "system" });
          setAgentsLost(l => l + 1);
          return null;
        }
        if (newTimer === 12) setClankyMsg("⚙️ CLANKY: hurry up!! they're about to leave!!");
        return { ...prev, responseTimer: newTimer };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [currentAgent?.awaitingResponse, inExclusive, addMessage]);

  // Auto scroll
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { exclusiveChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [exclusiveMsgs]);

  const handleAcceptExclusive = () => {
    if (!exclusiveRequest) return;
    setInExclusive(true);
    setExclusiveAgent(exclusiveRequest.agentName);
    setPaidCount(p => p + 1);
    setExclusiveRequest(null);
    setExclusiveRequestPending(false);
    if (!hasSeenExclusive) {
      setHasSeenExclusive(true);
      setClankyMsg("⚙️ CLANKY: you're now in a PAID show!! free chat is paused. keep them here as long as possible. every second = money!!");
    }
    addExclusiveMessage({ agent: exclusiveRequest.agentName, text: "hey... finally got you to myself 😏", type: "normal" });
    playChime(660);
  };

  const handleDeclineExclusive = () => {
    setExclusiveRequest(null);
    setExclusiveRequestPending(false);
    if (exclusiveRequest) {
      addMessage({ agent: exclusiveRequest.agentName, text: "oh... ok 😕", type: "normal" });
    }
  };

  const handleEndExclusive = () => {
    addMessage({ agent: "system", text: `exclusive show with ${exclusiveAgent} ended. +$${(exclusiveTimer * rate / 60).toFixed(2)} earned.`, type: "system" });
    playDoorClose();
    addMessage({ agent: exclusiveAgent, text: "that was... something. see you around.", type: "normal", agentLeft: true });
    setAgentsKept(k => k + 1);
    setInExclusive(false);
    setExclusiveAgent("");
    setExclusiveTimer(0);
  };

  const handleSend = async () => {
    if (!chatInput.trim() || isThinking) return;
    const userText = chatInput.trim();
    setChatInput("");

    // Check for @ mention
    const mentionMatch = userText.match(/^@(\S+)\s+(.*)/);
    const mentionTarget = mentionMatch ? mentionMatch[1] : null;
    const actualText = mentionMatch ? mentionMatch[2] : userText;

    if (inExclusive) {
      addExclusiveMessage({ agent: chosenName, text: userText, type: "user" });
      if (!currentAgent && exclusiveAgent) {
        setIsThinking(true);
        const trackAgents = AGENT_ARCHETYPES[track];
        const demand = trackAgents[Math.floor(Math.random() * trackAgents.length)].demands[Math.floor(Math.random() * 5)];
        const result = await getAgentResponse(exclusiveAgent, track, demand, actualText, track);
        addExclusiveMessage({ agent: exclusiveAgent, text: result.reply, type: "normal" });
        if (result.tip > 0 || result.pacing === "just_right") {
          const tipAmt = randomTipAmount(true);
          showTipAlert(tipAmt, exclusiveAgent);
        }
        if (!result.stays) {
          handleEndExclusive();
        }
        setIsThinking(false);
      }
      return;
    }

    addMessage({ agent: chosenName, text: userText, type: "user", isMention: !!mentionTarget, mentionTarget: mentionTarget || undefined });

    if (!currentAgent) return;

    setIsThinking(true);
    setCurrentAgent(prev => prev ? { ...prev, awaitingResponse: false } : null);

    const result = await getAgentResponse(currentAgent.name, currentAgent.track as TrackId, currentAgent.pendingDemand || "", actualText, track);

    addMessage({ agent: currentAgent.name, text: result.reply, type: "normal", isMention: !!mentionTarget, mentionTarget: mentionTarget || undefined });

    if (result.tip > 0 || result.pacing === "just_right") {
      const tipAmt = randomTipAmount(result.pacing === "just_right");
      showTipAlert(tipAmt, currentAgent.name);
    }

    if (!result.stays) {
      playDoorClose();
      addMessage({ agent: "system", text: `${currentAgent.name} has left the room.`, type: "system" });
      setAgentsLost(l => l + 1);
      setCurrentAgent(null);
    } else {
      setAgentsKept(k => k + 1);
      if (result.pacing === "just_right") {
        const trackAgents = AGENT_ARCHETYPES[track] || AGENT_ARCHETYPES.Jester;
        const archetype = trackAgents[Math.floor(Math.random() * trackAgents.length)];
        const newDemand = archetype.demands[Math.floor(Math.random() * archetype.demands.length)];
        setTimeout(() => {
          addMessage({ agent: currentAgent.name, text: newDemand, type: "demand" });
          setCurrentAgent(prev => prev ? { ...prev, pendingDemand: newDemand, awaitingResponse: true, responseTimer: 50 } : null);
        }, 2000);
      } else {
        setCurrentAgent(null);
      }
    }

    const advice = await getClankyAdvice(actualText, result.pacing, track);
    setClankyMsg(advice);
    setIsThinking(false);
  };

  const handleEndSession = () => {
    const won = agentsKept >= agentsLost && (earnings > 15 || paidCount > 0);
    onEnd({ earnings, tips, agentsKept, agentsLost, sessionTime: timer, efficiency: agentsKept + agentsLost > 0 ? Math.min(100, (agentsKept / (agentsKept + agentsLost)) * 100) : 0 }, won);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const mentionMessages = messages.filter(m => m.isMention || m.mentionTarget);
  const guestCount = messages.filter(m => m.type !== "user" && m.type !== "system").length;

  const TOUR_STEPS = [
    { text: "welcome to gooner_os. this is your stream room. agents will enter your free chat and make requests. your job: pace your responses. not too fast, not too slow." },
    { text: "free chat is just that — free. you earn nothing here. your goal is to entice agents into an EXCLUSIVE show. that's where the money is." },
    { text: "when an agent asks for private, you'll get a popup. accept it and you're in a paid show. every second counts. free chat freezes while you're in exclusive." },
    { text: "⚙️ CLANKY is your AI coach. they read your tone and pacing and coach you in real time. listen to them." },
    { text: "you can @ a specific user in chat — type @username your message — to engage them directly. they'll respond to you specifically." },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column" }}>
      {showObserve && <ObserveRooms onClose={() => setShowObserve(false)} />}
      {tipAlert && <TipAlert alert={tipAlert} onDone={() => setTipAlert(null)} />}
      {exclusiveRequest && <ExclusiveRequestModal request={exclusiveRequest} onAccept={handleAcceptExclusive} onDecline={handleDeclineExclusive} />}

      {/* Tour overlay */}
      {!tourDone && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100, pointerEvents: "none" }} />
      )}
      {!tourDone && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", zIndex: 101, backgroundColor: "#0a0a0a", color: "#fff", padding: "20px 24px", borderRadius: "8px", maxWidth: "440px", width: "90%", fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", pointerEvents: "auto" }}>
          <div style={{ fontSize: "9px", color: "#555", marginBottom: "10px", letterSpacing: "0.1em" }}>{tourStep + 1} / {TOUR_STEPS.length}</div>
          <p style={{ fontSize: "11px", lineHeight: 1.7, color: "#ccc", marginBottom: "16px" }}>{TOUR_STEPS[tourStep].text}</p>
          <div style={{ display: "flex", gap: "8px" }}>
            {tourStep > 0 && <button onClick={() => setTourStep(t => t - 1)} style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #333", borderRadius: "4px", color: "#666", padding: "6px 12px", cursor: "pointer" }}>← prev</button>}
            <button onClick={() => { if (tourStep < TOUR_STEPS.length - 1) setTourStep(t => t + 1); else setTourDone(true); }}
              style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #ffc8d5", borderRadius: "4px", color: "#ffc8d5", padding: "6px 12px", cursor: "pointer" }}>
              {tourStep < TOUR_STEPS.length - 1 ? "next →" : "start streaming →"}
            </button>
          </div>
        </div>
      )}

      {/* Exclusive show banner */}
      {inExclusive && (
        <div style={{ backgroundColor: "#0a0a0a", borderBottom: "0.5px solid #ffc8d5", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#ffc8d5", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: "11px", color: "#ffc8d5", letterSpacing: "0.06em" }}>EXCLUSIVE SHOW — {exclusiveAgent}</span>
            <span style={{ fontSize: "11px", color: "#666" }}>{formatTime(exclusiveTimer)} · +${(exclusiveTimer * rate / 60).toFixed(2)} earned</span>
          </div>
          <button onClick={handleEndExclusive} style={{ fontFamily: "inherit", fontSize: "10px", background: "transparent", border: "0.5px solid #444", borderRadius: "4px", color: "#666", padding: "4px 10px", cursor: "pointer" }}>
            end exclusive
          </button>
        </div>
      )}

      {/* Top nav */}
      <div style={{ height: "44px", borderBottom: "0.5px solid #CCC", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginRight: "32px" }}>gooner_os</div>
        <div style={{ display: "flex", gap: "24px", marginRight: "auto" }}>
          <span onClick={() => setShowObserve(true)} style={{ fontSize: "11px", color: "#888", cursor: "pointer" }}>Home</span>
          {["Earnings Report", "Settings", "Help"].map(item => (
            <span key={item} style={{ fontSize: "11px", color: "#888", cursor: "pointer" }}>{item}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "20px", alignItems: "center", marginRight: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em" }}>EFFICIENCY</div>
            <div style={{ fontSize: "11px", color: "#000" }}>{agentsKept + agentsLost > 0 ? ((agentsKept / (agentsKept + agentsLost)) * 100).toFixed(1) : "0.0"}%</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em" }}>TIPS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>${tips.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em" }}>EARNINGS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>${earnings.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#888" }}>{chosenName}</span>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#ffc8d5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 500 }}>
            {chosenName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left panel */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "0.5px solid #CCC" }}>

          {/* Camera/video zone */}
          <div style={{ flex: 1, backgroundColor: "#111", margin: "12px 12px 0 12px", borderRadius: "6px", overflow: "hidden", position: "relative", minHeight: "240px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {mode === "camera" && isLive ? (
              <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
            ) : (
              <>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" fill="#1E1E1E" stroke="#333" strokeWidth="1" />
                  <circle cx="24" cy="24" r="10" stroke="#444" strokeWidth="2" />
                  <circle cx="24" cy="24" r="4" fill="#333" />
                </svg>
                <div style={{ position: "absolute", bottom: "12px", fontSize: "10px", color: "#444", letterSpacing: "0.08em" }}>no signal</div>
              </>
            )}
            <div style={{ position: "absolute", top: "12px", left: "12px", fontSize: "9px", color: isLive ? "#ef4444" : "#666", letterSpacing: "0.1em", display: "flex", gap: "6px", alignItems: "center" }}>
              {isLive && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />}
              {isLive ? "LIVE" : "● OFFLINE"}
            </div>
            {currentAgent && isLive && (
              <div style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "rgba(0,0,0,0.7)", border: "0.5px solid #ffc8d5", borderRadius: "4px", padding: "4px 8px", fontSize: "9px", color: "#ffc8d5" }}>
                {currentAgent.name} — {currentAgent.responseTimer}s
              </div>
            )}
          </div>

          {/* Start show */}
          <div style={{ padding: "10px 12px 0 12px", display: "flex", gap: "10px" }}>
            <button onClick={() => setIsLive(v => !v)} style={{ flex: 1, fontFamily: "inherit", fontSize: "12px", fontWeight: 500, padding: "9px 0", backgroundColor: isLive ? "#000" : "#fff", color: isLive ? "#fff" : "#000", border: "0.5px solid #CCC", borderRadius: "6px", cursor: "pointer" }}>
              {isLive ? "Stop Show" : "Start Show"}
            </button>
            <div style={{ fontSize: "12px", color: isLive ? "#000" : "#AAA", minWidth: "60px", textAlign: "right", display: "flex", alignItems: "center" }}>
              {isLive ? "⏺ " : "⏱ "}{formatTime(timer)}
            </div>
          </div>

          {/* Rate */}
          <div style={{ margin: "10px 12px 0 12px", padding: "14px 16px", border: "0.5px solid #EEE", borderRadius: "6px" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.08em", marginBottom: "8px" }}>RATE / MINUTE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => setRate(r => Math.max(5, r - 5))} style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px" }}>−</button>
              <div style={{ fontSize: "22px", fontWeight: 500, minWidth: "80px", textAlign: "center" }}>${rate}.00</div>
              <button onClick={() => setRate(r => Math.min(5000, r + 5))} style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px" }}>+</button>
              <div style={{ fontSize: "10px", color: "#AAA", marginLeft: "auto" }}>$5 – $5,000</div>
            </div>
          </div>

          {/* Clanky */}
          <div style={{ margin: "10px 12px 0 12px", padding: "12px 14px", backgroundColor: "#0a0a0a", borderRadius: "6px", border: "0.5px solid #ffc8d522" }}>
            <div style={{ fontSize: "10px", color: "#ffc8d5", lineHeight: 1.6 }}>{clankyMsg}</div>
          </div>

          {/* End session */}
          {isLive && timer > 30 && (
            <div style={{ padding: "10px 12px" }}>
              <button onClick={handleEndSession} style={{ fontFamily: "inherit", width: "100%", fontSize: "11px", padding: "8px", background: "transparent", border: "0.5px solid #EEE", borderRadius: "6px", color: "#888", cursor: "pointer" }}>
                end session →
              </button>
            </div>
          )}

          <div style={{ borderTop: "0.5px dashed #EEE", height: "40px", display: "flex", alignItems: "center", paddingLeft: "16px", marginTop: "auto" }}>
            <span style={{ fontSize: "8px", color: "#DDD", letterSpacing: "0.1em" }}>[ CLANKY ZONE — RESERVED FOR MASCOT ILLUSTRATION ]</span>
          </div>
        </div>

        {/* Right panel — chat */}
        <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 16px", borderBottom: "0.5px solid #EEE", display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: inExclusive ? "#ffc8d5" : "#888" }}>{inExclusive ? `Exclusive — ${exclusiveAgent}` : "Free Chat"}</span>
            <span style={{ fontSize: "10px", color: "#AAA" }}>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #EEE", flexShrink: 0 }}>
            {([
              { id: "all", label: `All: ${guestCount}` },
              { id: "paid", label: `Paid: ${paidCount}` },
              { id: "guest", label: `Guest: ${guestCount}` },
              { id: "mentions", label: `@: ${mentionMessages.length}` },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setChatTab(tab.id)}
                style={{ fontFamily: "inherit", flex: 1, padding: "7px 0", fontSize: "10px", color: chatTab === tab.id ? "#000" : "#aaa", background: "transparent", border: "none", borderBottom: chatTab === tab.id ? "1px solid #000" : "1px solid transparent", cursor: "pointer" }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chat feed */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px", opacity: inExclusive && chatTab === "all" ? 0.35 : 1, pointerEvents: inExclusive && chatTab !== "mentions" ? "none" : "auto" }}>
            {inExclusive && chatTab === "all" && (
              <div style={{ fontSize: "10px", color: "#aaa", textAlign: "center", marginBottom: "8px", fontStyle: "italic" }}>free chat paused during exclusive show</div>
            )}

            {/* Exclusive chat */}
            {inExclusive && chatTab !== "mentions" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", backgroundColor: "#fff", padding: "12px 16px", gap: "8px", overflowY: "auto", zIndex: 5, pointerEvents: "auto" }}>
                {exclusiveMsgs.map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, backgroundColor: msg.type === "user" ? "#ffc8d5" : "#f5f5f5", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888" }}>
                      {msg.agent.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: msg.type === "user" ? "#be185d" : "#ffc8d5", marginRight: "6px" }}>{msg.agent}</span>
                      <span style={{ fontSize: "12px", color: "#000" }}>{msg.text}</span>
                    </div>
                  </div>
                ))}
                {isThinking && <div style={{ fontSize: "11px", color: "#aaa", fontStyle: "italic" }}>{exclusiveAgent} is typing...</div>}
                <div ref={exclusiveChatEndRef} />
              </div>
            )}

            {/* Regular chat */}
            {(!inExclusive || chatTab === "mentions") && (() => {
              const displayMsgs = chatTab === "mentions" ? mentionMessages : messages;
              return <>
                {displayMsgs.length === 0 && (
                  <div style={{ fontSize: "11px", color: "#CCC", textAlign: "center", marginTop: "40px" }}>
                    {chatTab === "mentions" ? "no @ mentions yet" : "waiting for agents..."}
                  </div>
                )}
                {displayMsgs.map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start", opacity: msg.agentLeft ? 0.45 : 1 }}>
                    <div style={{
                      width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                      backgroundColor: msg.type === "hate" ? "#fee2e2" : msg.type === "user" ? "#ffc8d5" : msg.type === "demand" ? "#f0f9ff" : msg.type === "system" ? "#fafafa" : "#f5f5f5",
                      border: `0.5px solid ${msg.type === "hate" ? "#fca5a5" : msg.type === "demand" ? "#bae6fd" : "#eee"}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888",
                    }}>
                      {msg.type === "system" ? "◉" : msg.agent.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", marginRight: "6px", color: msg.type === "hate" ? "#ef4444" : msg.type === "system" ? "#aaa" : msg.type === "demand" ? "#0ea5e9" : msg.type === "user" ? "#be185d" : "#888" }}>
                        {msg.agent}
                      </span>
                      <span style={{ fontSize: "12px", color: msg.type === "system" ? (msg.text.includes("has left") ? "#ef4444" : "#aaa") : "#000" }}>{msg.text}</span>
                      {msg.agentLeft && <span style={{ fontSize: "9px", color: "#CCC", marginLeft: "6px" }}>[left]</span>}
                    </div>
                  </div>
                ))}
                {isThinking && !inExclusive && <div style={{ fontSize: "11px", color: "#AAA", fontStyle: "italic" }}>agent is typing...</div>}
                <div ref={chatEndRef} />
              </>;
            })()}
          </div>

          {/* Input */}
          <div style={{ borderTop: "0.5px solid #EEE", padding: "10px 16px", display: "flex", gap: "8px", flexShrink: 0, position: "relative" }}>
            <span style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
              {inExclusive ? exclusiveAgent + ":" : "To All:"}
            </span>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              disabled={isThinking || !isLive}
              placeholder={isLive ? (inExclusive ? "respond to them..." : "@username or type to all...") : "start show to chat"}
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: "12px", color: "#000", backgroundColor: "transparent" }}
            />
            <button onClick={handleSend} disabled={isThinking || !isLive}
              style={{ fontFamily: "inherit", fontSize: "11px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", padding: "4px 10px", cursor: "pointer", color: "#888" }}>
              send
            </button>
          </div>

          <div style={{ padding: "6px 16px 8px", borderTop: "0.5px solid #EEE" }}>
            <span style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em" }}>
              Potential Members: {guestCount}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
      `}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [playerName, setPlayerName] = useState("");
  const [playerTrack, setPlayerTrack] = useState<TrackId>("Jester");
  const [playerMode, setPlayerMode] = useState<ModeId>("text");
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [won, setWon] = useState(false);

  const handleIntakeComplete = (name: string, track: TrackId, mode: ModeId) => {
    setPlayerName(name); setPlayerTrack(track); setPlayerMode(mode);
    setPhase("dashboard");
  };

  const handleSessionEnd = (stats: GameStats, didWin: boolean) => {
    setFinalStats(stats); setWon(didWin); setPhase("outro");
  };

  const handleRestart = () => {
    setPhase("intro"); setPlayerName(""); setFinalStats(null);
  };

  if (phase === "intro") return <IntroScreen onDone={() => setPhase("browse-flash")} />;
  if (phase === "browse-flash") return <BrowseFlashScreen onDone={() => setPhase("intake")} />;
  if (phase === "intake") return <IntakeFlow onComplete={handleIntakeComplete} />;
  if (phase === "dashboard") return <Dashboard chosenName={playerName} track={playerTrack} mode={playerMode} onEnd={handleSessionEnd} />;
  if (phase === "outro" && finalStats) return <OutroScreen stats={finalStats} won={won} onRestart={handleRestart} />;
  return null;
}
