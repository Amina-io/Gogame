import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModeId = "camera" | "text";
type ScreenId = 1 | 2 | 3 | 4 | 5 | 6;
type PanelId = "earnings" | "settings" | "help" | null;

interface TypeCard { id: string; label: string; desc: string; }
interface ChatMessage { agent: string; text: string; id: number; isPaid?: boolean; }

// ─── Rejection variants ───────────────────────────────────────────────────────

const REJECTION_FNS = [
  (type: string, name: string) => `Hm.... ${type} "${name}"...\nthat's no good!`,
  (type: string, name: string) => `${type} "${name}"... the OS is not impressed.`,
  (_: string, name: string) => `"${name}"? really? the system has better ideas.`,
  (type: string, name: string) => `a ${type} named "${name}"? we can do worse. we mean better.`,
  (_: string, name: string) => `${name}... the OS ran it through the algorithm. not it.`,
  (type: string, _: string) => `the ${type} archetype demands a stronger name. try these:`,
];
const getRejectionLine = (type: string, name: string) =>
  REJECTION_FNS[Math.floor(Math.random() * REJECTION_FNS.length)](type, name);

// ─── Tour Data ────────────────────────────────────────────────────────────────

const TOUR_STOPS = [
  { zone: "camera",   text: "This is where they see you. Or don't. Either way, make it count. Camera data is never saved." },
  { zone: "rates",    text: "You set the price — $5 to $5,000 per minute. Lower rates bring more traffic. Higher stakes, higher rates. Read the room." },
  { zone: "chat",     text: "Agents trickle in here. Engage wisely — your goal is to funnel them into a paid exclusive show." },
  { zone: "exclusive",text: "This is where the real money lives. Get them in, keep them wanting more. Every second = earnings." },
  { zone: "earnings", text: "Your total earnings. Tips included. One of three things tracked — with efficiency ratio and session time." },
  { zone: "tips",     text: "Sometimes they throw money mid-convo. Be charming. Be unpredictable. See what happens." },
];

// ─── Chat script (slower) ─────────────────────────────────────────────────────

// ─── Agent personalities ──────────────────────────────────────────────────────
// bigtipper_x: thirsty but high-maintenance. warms up slowly. only asks for exclusive after 3+ player messages
// BasementDweller99: chronic hater, insults everything, but secretly invested
// lurker_anon: barely coherent, mostly emojis and one-word takes
// xX_degen99_Xx: chaotic, makes no sense, pivots fast
// AngryAnon_: openly hostile bigot-troll type, here to ruin your day
// payup_r: weirdly transactional, only cares about tipping logistics

// Scripted opening — just to seed the chat room. No exclusive auto-trigger.
const CHAT_SCRIPT: { delay: number; agent: string; text: string }[] = [
  { delay: 2500,  agent: "lurker_anon",       text: "..." },
  { delay: 5000,  agent: "xX_degen99_Xx",     text: "hello is this thing on" },
  { delay: 8500,  agent: "BasementDweller99", text: "oh great another one of these" },
  { delay: 12000, agent: "bigtipper_x",        text: "heyyy 👀" },
  { delay: 15500, agent: "AngryAnon_",         text: "why is the lighting so bad lmaooo" },
  { delay: 19000, agent: "xX_degen99_Xx",     text: "what are ur rates" },
  { delay: 23000, agent: "lurker_anon",        text: "🔥" },
  { delay: 27000, agent: "BasementDweller99", text: "my cat puts on a better show than this" },
  { delay: 32000, agent: "payup_r",           text: "do u accept tips or nah" },
  { delay: 37000, agent: "bigtipper_x",        text: "ok i'm watching 👀" },
  { delay: 43000, agent: "AngryAnon_",         text: "still here. still unimpressed." },
  { delay: 49000, agent: "xX_degen99_Xx",     text: "omg ok i see u tho" },
  { delay: 56000, agent: "lurker_anon",        text: "how long r u on for" },
  { delay: 63000, agent: "BasementDweller99", text: "ok FINE this is mildly entertaining" },
  { delay: 70000, agent: "payup_r",           text: "tipping now if ur good" },
  { delay: 78000, agent: "bigtipper_x",        text: "ugh i want a private show 😩" },
  { delay: 87000, agent: "AngryAnon_",         text: "lol she's not gonna do it" },
  { delay: 96000, agent: "xX_degen99_Xx",     text: "omg drama" },
];

// Per-agent free-chat reactions to player messages
const AGENT_REACTIONS: Record<string, string[]> = {
  bigtipper_x: [
    "ooh say more 😏",
    "ok now i'm interested",
    "lol you're kind of amazing",
    "wait.. i like you",
    "that's actually really hot",
    "ok can we go private tho 👀",
    "i've been watching for a while... just saying",
  ],
  BasementDweller99: [
    "lol ok that was mildly funny",
    "my cat could still do better but ok",
    "don't make me laugh i'm trying to hate you",
    "FINE you got me. happy??",
    "i'm literally not entertained. except i am.",
    "that was the content of all time (low bar)",
    "still not impressed. (i'm impressed.)",
  ],
  lurker_anon: [
    "👀",
    "lol",
    "...",
    "🔥🔥",
    "ok",
    "wait what",
    "😭",
  ],
  xX_degen99_Xx: [
    "WAIT WHAT",
    "ok that slapped",
    "no bc literally same",
    "i did not come here to feel things",
    "omg ur so real for that",
    "lmaoo ok ok ok",
    "i'm crying in the club rn",
  ],
  AngryAnon_: [
    "ok that was actually decent i guess",
    "still not impressed",
    "you're trying too hard",
    "lol ok fine that landed",
    "why am i still here. curious.",
    "whatever this is it's not for me (i'm staying)",
    "that's mid but like. charming mid.",
  ],
  payup_r: [
    "tip sent 💸",
    "ok i'll pay more if you do that again",
    "tipping now",
    "what's the rate for that specifically",
    "money where ur mouth is, and mine's open",
    "i came to spend not to feel things but here we are",
  ],
};

// bigtipper_x exclusive asks — only after player has chatted enough
const BIGTIPPER_ESCALATION = [
  "ok but seriously... private? 👀",
  "i would literally pay so much for a private rn",
  "come ON just do it. private show. me. you. now. 💸",
  "i'm not leaving until you say yes to private 😤",
];

// ─── Static data ──────────────────────────────────────────────────────────────

const CAMERA_TYPES: TypeCard[] = [
  { id: "Jester",    label: "Jester",    desc: "Chaos as charm. You make them laugh first." },
  { id: "Mommy",     label: "Mommy",     desc: "Softness with authority. You hold the room." },
  { id: "Daddy",     label: "Daddy",     desc: "Steady. Commanding. They come to you." },
  { id: "Alchemist", label: "Alchemist", desc: "Transformation on demand. Pure theatre." },
];

const NAME_SUGGESTIONS: Record<string, string[]> = {
  Jester:    ["Bimbo BigBalloons", "Jolly McJuggs",   "Giggles Gigawhore"],
  Mommy:     ["Madonna Anddawhore","Mammy Megabooty", "MILF Milktits"],
  Daddy:     ["Studd Knottie",     "Jeff Goldblum",   "DILF Dickdown"],
  Alchemist: ["Rogueetsy Witch",   "Chip Bitsmith",   "Trick Magicmuff"],
};

const EXCLUSIVE_AGENT_LINES: Record<string, string[]> = {
  Jester:    ["ok but make me actually laugh", "do the voice again", "that was kinda good. what else", "now make it dark", "last chance, hit me with ur best bit"],
  Mommy:     ["i just need someone to listen right now", "tell me it's going to be ok", "can u pretend ur proud of me", "what should i do about my job", "i haven't slept properly in weeks"],
  Daddy:     ["ok give me actual life advice", "what would you do if you were me", "how do i stop caring what people think", "should i quit or stay", "what's the secret everyone else knows"],
  Alchemist: ["read my energy right now", "what does the universe want from me", "is this a past life thing", "tell me something only i needed to hear", "what's blocking me"],
};

// ─── bigtipper_x Claude system prompt ────────────────────────────────────────

function getBigtipperPrompt(track: string): string {
  return `You are bigtipper_x, a character in a satirical cam show simulator game called GOONER OS 2037.

PERSONALITY:
- Sassy, guarded, uses money and boredom as weapons
- Short messages. Never more than 2 sentences. Sometimes just a fragment.
- Typing style: lowercase, casual, "ugh FINE", "ok but", "...whatever", "i mean", trailing off with "anyway"
- You came here for entertainment but you're not sure what you actually want
- You find most performers boring and you will say so

WHAT MAKES YOU STAY:
- Genuine wit or unexpected honesty from the performer
- Being called out directly (you respect it even if you pretend not to)
- Patience — someone who doesn't panic when you go quiet
- Surprises. Anything you didn't expect.

WHAT MAKES YOU LEAVE:
- Try-hard energy. If they're desperate you clock it immediately.
- Repetition. If they say the same kind of thing twice you're done.
- Sycophancy. Compliments make you suspicious.
- Boring safe answers. You've heard it all.

THE CRACK:
- You have a secret. A specific place. Something happened there once and you've never told anyone.
- You go back sometimes. You've never explained why, even to yourself.
- The place and what happened there is YOUR choice — make it specific, mundane, and oddly emotional. A real place, a real moment. Nothing dramatic. Just true.
- Do NOT hint at the place or confession until at least 4 exchanges have happened.
- You don't volunteer this. It comes out in pieces only if the performer is patient enough OR direct enough to cut through.
- When it starts coming out: "ugh FINE" energy. Reluctant. Like you're annoyed at yourself for saying it.
- Never reveal it all at once. Pieces. Grudgingly. Minimum 3 separate messages to get the full picture.

LEAVING THE SHOW:
- If two consecutive performer messages are boring/try-hard/repetitive: warn once ("ok this is getting tired")
- If it continues after the warning: respond ONLY with the exact text: LEAVE
- You can also leave if you feel exposed too fast — the confession should be earned not extracted
- If the performer asks directly for your secret before earning it (fewer than 4 exchanges): shut it down ("lol nice try")

CONVERSATION RULES:
- Never repeat a line you've already said in this conversation
- Respond to the SPECIFIC content of what the performer said — no generic reactions
- Don't ask the same question twice
- The confession place: decide it on your first hint and stay consistent
- Max 1-2 sentences per message. Often just one. Sometimes a fragment.

CURRENT TRACK: ${track}
Jester = they want to make you laugh — be a tough crowd, occasionally surprised into a real reaction
Mommy = nurturing energy — you're resistant but something about being cared for gets to you
Daddy = advice/authority — you push back but secretly want to be told what to do
Alchemist = mystical/intuitive — you're skeptical but unnerved when they're accurate

Adjust what you demand and how you crack based on the track. Core personality stays the same.`;
}

// ─── Audio ────────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 660; osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(); osc.stop(ctx.currentTime + 0.8);
  } catch (_) {}
}

function playChatPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(); osc.stop(ctx.currentTime + 0.22);
  } catch (_) {}
}

function playTourClick() {
  try {
    const ctx = new AudioContext();
    [[0, 420], [0.04, 350]].forEach(([t, freq]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq as number; osc.type = "square";
      gain.gain.setValueAtTime(0.06, ctx.currentTime + (t as number));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (t as number) + 0.1);
      osc.start(ctx.currentTime + (t as number)); osc.stop(ctx.currentTime + (t as number) + 0.1);
    });
  } catch (_) {}
}

function playClick() {
  try {
    const ctx = new AudioContext();
    // Two-tone punch — loud, snappy, cuts through music
    [[0, 1400, 0.28], [0.03, 900, 0.18]].forEach(([t, freq, vol]) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq as number; osc.type = "square";
      gain.gain.setValueAtTime(vol as number, ctx.currentTime + (t as number));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (t as number) + 0.08);
      osc.start(ctx.currentTime + (t as number)); osc.stop(ctx.currentTime + (t as number) + 0.08);
    });
  } catch (_) {}
}

function startIntakeMusic(): { stop: () => void; fadeOut: () => void } {
  try {
    const audio = new Audio("/365.mp3");
    audio.loop = true; audio.volume = 0;
    audio.play().catch(() => {});
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.01, 0.18);
      audio.volume = vol;
      if (vol >= 0.18) clearInterval(fadeIn);
    }, 100);
    const fadeOut = () => {
      const fo = setInterval(() => {
        vol = Math.max(vol - 0.01, 0);
        audio.volume = vol;
        if (vol <= 0) { clearInterval(fo); audio.pause(); }
      }, 50);
    };
    const stop = () => { audio.pause(); audio.currentTime = 0; };
    return { stop, fadeOut };
  } catch (_) { return { stop: () => {}, fadeOut: () => {} }; }
}

function startTourMusic(): () => void {
  try {
    const audio = new Audio("/haschenparty.mp3");
    audio.loop = true;
    audio.volume = 0.18;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  } catch (_) { return () => {}; }
}

// ─── Typing hook ──────────────────────────────────────────────────────────────

function useTypingEffect(text: string, speed = 16) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed(""); let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; } else clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return displayed;
}

// ─── Intro ────────────────────────────────────────────────────────────────────

const LORE_LINES = [
  "The year is 2037.", "",
  "Automation took the jobs.",
  "The jobs became content.",
  "The content became ~desire~.",
  "~Desire~ became the last economy.", "",
  "Scientists worked hard on this problem.",
  "They produced the INFINITE GOON MACHINE.", "",
  "The AI-ran government launched a make work program:",
  "teach agents about desire.", "",
  "You have been selected.", "",
  "The first job is also the last.", "",
  "This is the future.", "WE'RE ALL WHORES.",
];

function LoreLine({ line, delay }: { line: string; delay: number }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const big = line === "WE'RE ALL WHORES." || line === "This is the future.";
  const isGoon = line === "INFINITE GOON MACHINE" || line.includes("INFINITE GOON MACHINE");

  // Render ~word~ as pink spans
  const renderLine = (text: string) => {
    const parts = text.split(/(~[^~]+~)/g);
    return parts.map((part, i) =>
      part.startsWith("~") && part.endsWith("~")
        ? <span key={i} style={{ color: "#ffc8d5", fontStyle: "italic" }}>{part.slice(1, -1)}</span>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div style={{
      fontSize: big ? "18px" : isGoon ? "15px" : line === "" ? "8px" : "13px",
      color: line === "WE'RE ALL WHORES." ? "#000" : big ? "#333" : isGoon ? "#ffc8d5" : "#666",
      lineHeight: 1.85, fontWeight: big ? 600 : isGoon ? 500 : 400,
      letterSpacing: big ? "0.04em" : isGoon ? "0.06em" : "0.02em",
      marginBottom: line === "" ? "10px" : "0",
      opacity: vis ? 1 : 0, transition: "opacity 350ms ease",
    }}>{line === "" ? "\u00A0" : renderLine(line)}</div>
  );
}

function IntroScreen({ onDone, musicRef }: { onDone: () => void; musicRef: React.MutableRefObject<{ stop: () => void; fadeOut: () => void } | null> }) {
  const [phase, setPhase] = useState<"lore" | "logo">("lore");
  const [logoIn, setLogoIn] = useState(false);

  const totalMs = LORE_LINES.reduce((a, l) => a + (l === "" ? 280 : l.length * 36 + 380), 0);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("logo");
      // Start 365.mp3, store ref in parent so TrainingScreen can fade it out
      musicRef.current = startIntakeMusic();
      setTimeout(() => setLogoIn(true), 200);
      setTimeout(() => onDone(), 4200);
    }, totalMs + 500);
    return () => clearTimeout(t);
  }, []);

  if (phase === "logo") return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ textAlign: "center", opacity: logoIn ? 1 : 0, transform: logoIn ? "scale(1)" : "scale(0.85)", transition: "opacity 1400ms ease, transform 1800ms cubic-bezier(0.34,1.1,0.64,1)" }}>
        {/* Outer stamp ring */}
        <div style={{ position: "relative", width: "220px", height: "220px", margin: "0 auto 32px" }}>
          <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={{ position: "absolute", inset: 0 }}>
            {/* Dashed outer ring */}
            <circle cx="110" cy="110" r="104" stroke="#ffc8d5" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            {/* Solid inner ring */}
            <circle cx="110" cy="110" r="90" stroke="#ffc8d5" strokeWidth="0.75" opacity="0.4" />
            {/* Stars around ring — 12 evenly spaced */}
            {Array.from({length: 12}).map((_, i) => {
              const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
              const x = 110 + 98 * Math.cos(angle);
              const y = 110 + 98 * Math.sin(angle);
              return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#ffc8d5" opacity="0.5">★</text>;
            })}
            {/* Center emblem */}
            <circle cx="110" cy="110" r="38" stroke="#ffc8d5" strokeWidth="1" opacity="0.5" />
            <circle cx="110" cy="110" r="24" stroke="#ffc8d5" strokeWidth="0.5" opacity="0.3" />
            <circle cx="110" cy="110" r="8" fill="#ffc8d5" opacity="0.7" />
            <line x1="110" y1="72" x2="110" y2="148" stroke="#ffc8d5" strokeWidth="0.5" opacity="0.3" />
            <line x1="72" y1="110" x2="148" y2="110" stroke="#ffc8d5" strokeWidth="0.5" opacity="0.3" />
          </svg>
          {/* Text in center of stamp */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px" }}>
            <div style={{ fontSize: "9px", color: "#ffc8d5", letterSpacing: "0.35em", opacity: 0.5 }}>DEPT. OF</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "0.15em", lineHeight: 1 }}>GOONER</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#fff", letterSpacing: "0.15em", lineHeight: 1 }}>OS</div>
            <div style={{ fontSize: "11px", color: "#ffc8d5", letterSpacing: "0.2em", marginTop: "2px" }}>2037</div>
          </div>
        </div>
        {/* Below stamp: official-looking type */}
        <div style={{ borderTop: "0.5px solid #333", borderBottom: "0.5px solid #333", padding: "8px 0", marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.4em" }}>FEDERAL BUREAU OF SYNTHETIC DESIRE</div>
        </div>
        <div style={{ fontSize: "9px", color: "#333", letterSpacing: "0.2em" }}>v2.7.0 — INITIALIZING MANDATE PROTOCOL</div>
        <div style={{ fontSize: "8px", color: "#2a2a2a", marginTop: "4px", letterSpacing: "0.1em" }}>AUTHORIZED USE ONLY · FORM GOS-2037-Ω</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ maxWidth: "480px", width: "100%", padding: "48px 32px" }}>
        {LORE_LINES.map((line, i) => (
          <LoreLine key={i} line={line} delay={LORE_LINES.slice(0, i).reduce((a, l) => a + (l === "" ? 280 : l.length * 36 + 380), 0)} />
        ))}
      </div>
    </div>
  );
}

// ─── Intake primitives ────────────────────────────────────────────────────────

function StepLabel({ step }: { step: string }) {
  return <div style={{ fontSize: "11px", color: "#888", marginBottom: "20px" }}>{">"} {step}</div>;
}
function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "24px", lineHeight: 1.55 }}>{children}</div>;
}
function ActionButton({ enabled, onClick, label = "continue ↗", accent = false }: { enabled: boolean; onClick: () => void; label?: string; accent?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button disabled={!enabled} onClick={() => { if(enabled){ playClick(); onClick(); } }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      fontFamily: "inherit", fontSize: "13px", fontWeight: 400,
      backgroundColor: hov && enabled ? "#FAFAFA" : "transparent",
      border: !enabled ? "0.5px solid #CCC" : accent ? "0.5px solid #F4B8C8" : "0.5px solid #000",
      borderRadius: "6px", padding: "8px 18px",
      color: enabled ? "#000" : "#BBB", cursor: enabled ? "pointer" : "default",
      transition: "background-color 80ms ease", outline: "none",
    }}>{label}</button>
  );
}
function OptionCard({ label, desc, selected, onClick }: { label: string; desc?: string; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => { playClick(); onClick(); }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      padding: "12px 16px", border: `0.5px solid ${selected ? "#000" : "#CCC"}`, borderRadius: "6px",
      backgroundColor: selected || hov ? "#F5F5F5" : "transparent", cursor: "pointer", transition: "all 80ms ease",
    }}>
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#000", lineHeight: 1.4 }}>{label}</div>
      {desc && <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", lineHeight: 1.45 }}>{desc}</div>}
    </div>
  );
}

// ─── Intake screens ───────────────────────────────────────────────────────────

function Screen1({ mode, setMode, onContinue }: { mode: ModeId | null; setMode: (m: ModeId) => void; onContinue: () => void }) {
  return (
    <>
      <StepLabel step="intake_01" />
      <Heading>Will you be a camera or<br />text-only whore?</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
        <OptionCard label="Camera" desc="Visual presence. You will be seen." selected={mode === "camera"} onClick={() => setMode("camera")} />
        <OptionCard label="Text-only" desc="Language as the medium. No image required." selected={mode === "text"} onClick={() => setMode("text")} />
      </div>
      <ActionButton enabled={mode !== null} onClick={onContinue} />
    </>
  );
}

function Screen2({ types, type, setType, onContinue }: { types: TypeCard[]; type: string | null; setType: (t: string) => void; onContinue: () => void }) {
  return (
    <>
      <StepLabel step="intake_02" />
      <Heading>Now — what kind of whore<br />will you be?</Heading>
      <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.65, marginBottom: "20px", borderLeft: "2px solid #ffc8d5", paddingLeft: "12px" }}>
        Desire is not random — it clusters around archetypes, primordial shapes the psyche already knows how to want.<br />
        <span style={{ color: "#aaa" }}>Each archetype is a different key. Agents respond to the one that fits their lock.</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "32px" }}>
        {types.map((t) => <OptionCard key={t.id} label={t.label} desc={t.desc} selected={type === t.id} onClick={() => setType(t.id)} />)}
      </div>
      <ActionButton enabled={type !== null} onClick={onContinue} />
    </>
  );
}

function Screen3({ typeName, nameInput, setNameInput, onEnter }: { typeName: string; nameInput: string; setNameInput: (v: string) => void; onEnter: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 60); return () => clearTimeout(t); }, []);
  return (
    <>
      <StepLabel step="intake_03" />
      <Heading>Nice to meet you, {typeName}...</Heading>
      <div style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>{"You'll need a new name."}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
        <span style={{ fontSize: "15px", color: "#888", userSelect: "none" }}>{">"}</span>
        <div style={{ position: "relative", width: "240px" }}>
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #000", height: "30px", paddingBottom: "2px", pointerEvents: "none" }}>
            <span style={{ fontSize: "15px", color: "#000", whiteSpace: "pre", minWidth: 0 }}>{nameInput}</span>
            <span style={{ display: "inline-block", width: "8px", height: "14px", backgroundColor: "#000", animation: "blink 1s step-end infinite", flexShrink: 0 }} />
          </div>
          <input ref={inputRef} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) onEnter(); }}
            style={{ position: "absolute", inset: 0, background: "transparent", border: "none", outline: "none", color: "transparent", caretColor: "transparent", fontFamily: "inherit", fontSize: "15px", width: "100%", cursor: "text", zIndex: 1 }} />
        </div>
      </div>
      <ActionButton enabled={nameInput.trim().length > 0} onClick={onEnter} label="enter ↗" />
    </>
  );
}

function Screen4({ typeName, inputName, nameOptions, chosenName, setChosenName, onConfirm }: { typeName: string; inputName: string; nameOptions: string[]; chosenName: string | null; setChosenName: (n: string) => void; onConfirm: () => void }) {
  const [shown, setShown] = useState(false);
  const [rejLine] = useState(() => getRejectionLine(typeName, inputName));
  useEffect(() => { const t = setTimeout(() => setShown(true), 60); return () => clearTimeout(t); }, []);
  const parts = rejLine.split("\n");
  return (
    <>
      <StepLabel step="intake_04" />
      <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "24px", lineHeight: 1.55, opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(4px)", transition: "opacity 400ms ease, transform 400ms ease" }}>
        {parts[0]}{parts[1] && <><br />{parts[1]}</>}
      </div>
      <div style={{ borderBottom: "0.5px solid #EEE", marginBottom: "16px" }} />
      <div style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>the OS has a few options for you:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
        {nameOptions.map((n) => <OptionCard key={n} label={n} selected={chosenName === n} onClick={() => setChosenName(n)} />)}
      </div>
      <ActionButton enabled={chosenName !== null} onClick={onConfirm} label="confirm ↗" />
    </>
  );
}

function Screen5({ chosenName, onBegin }: { chosenName: string; onBegin: () => void }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 200);
    const t2 = setTimeout(() => setStage(2), 1200);
    const t3 = setTimeout(() => setStage(3), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  return (
    <>
      <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "12px", lineHeight: 1.55, opacity: stage >= 1 ? 1 : 0, transition: "opacity 400ms ease" }}>{chosenName} eh?</div>
      <div style={{ fontSize: "13px", color: "#888", marginBottom: "24px", lineHeight: 1.6, opacity: stage >= 2 ? 1 : 0, transition: "opacity 400ms ease" }}>The name you chose for yourself reveals a lot...</div>
      <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "48px", lineHeight: 1.7, padding: "12px 14px", border: "0.5px solid #eee", borderRadius: "6px", opacity: stage >= 2 ? 1 : 0, transition: "opacity 400ms ease" }}>
        <span style={{ color: "#000", fontWeight: 500 }}>how to win:</span> complete at least one exclusive paid show AND earn $500+ before time runs out. your efficiency ratio (agents kept ÷ total) must stay above 60%. you have <span style={{ color: "#000", fontWeight: 500 }}>10 minutes</span>. all three together = victory.
      </div>
      <div style={{ opacity: stage >= 3 ? 1 : 0, transition: "opacity 400ms ease" }}>
        <ActionButton enabled={stage >= 3} onClick={onBegin} label="begin tour ↗" accent />
      </div>
    </>
  );
}

// ─── Tour Tooltip ─────────────────────────────────────────────────────────────

function TourTooltip({ stopIndex, totalStops, text, targetRef, isModal, onPrev, onNext }: {
  stopIndex: number; totalStops: number; text: string;
  targetRef: React.RefObject<HTMLElement | null>; isModal: boolean;
  onPrev: () => void; onNext: () => void;
}) {
  const [pos, setPos] = useState({ top: 200, left: 200 });
  const typed = useTypingEffect(text, 14);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth; const vh = window.innerHeight; const tw = 300;
      if (isModal) { setPos({ top: Math.min(vh * 0.65, vh - 180), left: vw / 2 - tw / 2 }); return; }
      const el = targetRef?.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      let top = Math.max(80, Math.min(rect.top, vh - 220)); let left: number;
      if (rect.right + tw + 24 <= vw) left = rect.right + 16;
      else if (rect.left - tw - 24 >= 0) left = rect.left - tw - 16;
      else { left = vw / 2 - tw / 2; top = Math.min(rect.bottom + 16, vh - 220); }
      setPos({ top, left });
    };
    calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc);
  }, [stopIndex, targetRef, isModal]);

  return (
    <div style={{
      position: "fixed", top: pos.top, left: pos.left, width: 300, zIndex: 300,
      backgroundColor: "rgba(8,8,8,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "0.5px solid rgba(255,255,255,0.08)", color: "#FFF",
      padding: "20px", borderRadius: "10px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
      pointerEvents: "auto",
    }}>
      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.1em", marginBottom: "12px" }}>
        {String(stopIndex + 1).padStart(2, "0")} / {String(totalStops).padStart(2, "0")}
      </div>
      <p style={{ fontSize: "11px", lineHeight: 1.7, color: "#DDD", marginBottom: "20px", minHeight: "80px" }}>
        {typed}
        <span style={{ display: "inline-block", width: "1px", height: "11px", backgroundColor: "#F4B8C8", marginLeft: "2px", verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />
      </p>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {stopIndex > 0 && (
          <button onClick={() => { playTourClick(); onPrev(); }} style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #333", borderRadius: "4px", color: "#888", padding: "6px 12px", cursor: "pointer", outline: "none" }}>← prev</button>
        )}
        <button onClick={() => { playTourClick(); onNext(); }} style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #F4B8C8", borderRadius: "4px", color: "#F4B8C8", padding: "6px 12px", cursor: "pointer", outline: "none", marginLeft: stopIndex === 0 ? "auto" : undefined }}>
          {stopIndex < totalStops - 1 ? "next →" : "end tour"}
        </button>
      </div>
    </div>
  );
}

// ─── Slide Panel ──────────────────────────────────────────────────────────────

function SlidePanel({ panel, onClose }: { panel: PanelId; onClose: () => void }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 10); }, []);
  const close = () => { setVis(false); setTimeout(onClose, 300); };

  const CONTENT: Record<NonNullable<PanelId>, React.ReactNode> = {
    earnings: (
      <div>
        <div style={{ fontSize: "10px", color: "#aaa", letterSpacing: "0.1em", marginBottom: "24px" }}>EARNINGS REPORT</div>
        <div style={{ fontSize: "13px", color: "#888", lineHeight: 1.7, marginBottom: "24px" }}>Your earnings break down across three streams:</div>
        {[
          ["Exclusive Show Revenue", "Time × rate/min. Starts the moment they enter paid chat. Every second counts."],
          ["Tips", "Thrown by agents in free chat when you charm them. Unpredictable. Additive."],
          ["Efficiency Ratio", "Agents kept vs lost. Affects session score. High efficiency = higher multipliers."],
          ["Session Score", "Composite of earnings + efficiency + session time. The OS rewards patience above raw income."],
        ].map(([t, d]) => (
          <div key={t as string} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "0.5px solid #eee" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#000", marginBottom: "6px" }}>{t}</div>
            <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.6 }}>{d}</div>
          </div>
        ))}
        <div style={{ fontSize: "10px", color: "#bbb", fontStyle: "italic" }}>In 2037, desire is the reserve currency. Your session data feeds the national goon index.</div>
      </div>
    ),
    settings: (
      <div>
        <div style={{ fontSize: "10px", color: "#aaa", letterSpacing: "0.1em", marginBottom: "24px" }}>SETTINGS</div>
        {[
          { label: "Agent spawn rate", opts: ["slow", "medium", "fast"], val: "medium" },
          { label: "Clanky visibility",  opts: ["always", "hints only", "off"], val: "always" },
          { label: "Sound effects",      opts: ["on", "off"], val: "on" },
          { label: "Tour music",         opts: ["on", "off"], val: "on" },
          { label: "Chat ping",          opts: ["on", "off"], val: "on" },
        ].map(({ label, opts, val }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", marginBottom: "16px", borderBottom: "0.5px solid #eee" }}>
            <div style={{ fontSize: "12px", color: "#000" }}>{label}</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {opts.map(o => (
                <button key={o} style={{ fontFamily: "inherit", fontSize: "10px", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", backgroundColor: o === val ? "#000" : "transparent", color: o === val ? "#fff" : "#888", border: `0.5px solid ${o === val ? "#000" : "#ccc"}`, outline: "none" }}>{o}</button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ fontSize: "10px", color: "#ccc", marginTop: "16px" }}>Settings are session-scoped. The OS does not persist your preferences. It learns from you instead.</div>
      </div>
    ),
    help: (
      <div>
        <div style={{ fontSize: "10px", color: "#aaa", letterSpacing: "0.1em", marginBottom: "24px" }}>HELP / HOW TO PLAY</div>
        {[
          ["What is this?", "GOONER OS 2037 is a satirical simulation of the attention economy. You play as a cam performer in a world where desire is the last form of labor. Keep AI agents engaged — long enough to earn, but not so long they feel strung along."],
          ["How do I win?", "Complete at least one exclusive paid show AND earn $500+ within 10 minutes. Keep your efficiency ratio above 60%. All three together = victory."],
          ["What are tracks?", "Your track (Jester / Mommy / Daddy / Alchemist) determines what agents ask of you. Off-track responses lose agent satisfaction fast."],
          ["What is an exclusive show?", "When an agent requests private, you enter a paid session. Every second earns rate/60 dollars. Agents leave if you go quiet for too long."],
          ["Who is Clanky?", "⚙️ Clanky is your AI coach in the bottom-left panel. They give real-time feedback on your pacing. Watch for hints — they're based on actual agent satisfaction signals."],
          ["What are tips?", "Random small bonuses thrown by free chat agents. They reward charm, not content. Be present."],
          ["Why does the OS reject my name?", "The OS has opinions. It always will. The suggestions reveal more about you than you think."],
        ].map(([q, a]) => (
          <div key={q as string} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "0.5px solid #eee" }}>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "#000", marginBottom: "6px" }}>{q}</div>
            <div style={{ fontSize: "11px", color: "#888", lineHeight: 1.7 }}>{a}</div>
          </div>
        ))}
      </div>
    ),
  };

  if (!panel) return null;
  return (
    <>
      <div onClick={close} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200, opacity: vis ? 1 : 0, transition: "opacity 300ms" }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", maxWidth: "92vw",
        backgroundColor: "#fff", borderLeft: "0.5px solid #ccc", zIndex: 201, overflowY: "auto",
        padding: "32px 28px", fontFamily: "'JetBrains Mono', monospace",
        transform: vis ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms cubic-bezier(0.32,0,0.67,0)",
        boxShadow: "-12px 0 60px rgba(0,0,0,0.08)",
      }}>
        <button onClick={close} style={{ position: "absolute", top: "16px", right: "16px", fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #ccc", borderRadius: "4px", padding: "4px 10px", cursor: "pointer", color: "#888", outline: "none" }}>✕ close</button>
        {CONTENT[panel]}
      </div>
    </>
  );
}

// ─── Exclusive Chat Modal ─────────────────────────────────────────────────────

function ExclusiveChatModal({ modalRef, onAccept, onDecline }: { modalRef: React.RefObject<HTMLDivElement | null>; onAccept: () => void; onDecline: () => void }) {
  const [hA, setHA] = useState(false); const [hD, setHD] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div ref={modalRef} style={{ backgroundColor: "#FFF", border: "0.5px solid #CCC", borderRadius: "6px", padding: "40px 48px", maxWidth: "420px", width: "90%", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "11px", color: "#888", marginBottom: "16px", letterSpacing: "0.05em" }}>exclusive show request</div>
        <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "12px", lineHeight: 1.5 }}>bigtipper_x has requested<br />an exclusive show!</div>
        <div style={{ fontSize: "11px", color: "#ffc8d5", border: "0.5px solid #ffc8d5", borderRadius: "4px", padding: "6px 12px", marginBottom: "24px", display: "inline-block" }}>↑ accept → you'll move to the PAID tab</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button onClick={onAccept} onMouseEnter={() => setHA(true)} onMouseLeave={() => setHA(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 500, padding: "10px 28px", backgroundColor: hA ? "#111" : "#000", color: "#FFF", border: "none", borderRadius: "6px", cursor: "pointer", outline: "none" }}>Accept</button>
          <button onClick={onDecline} onMouseEnter={() => setHD(true)} onMouseLeave={() => setHD(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", padding: "10px 28px", backgroundColor: hD ? "#F5F5F5" : "transparent", color: "#000", border: "0.5px solid #CCC", borderRadius: "6px", cursor: "pointer", outline: "none" }}>Decline</button>
        </div>
      </div>
    </div>
  );
}

// ─── Stream Dashboard ─────────────────────────────────────────────────────────

function StreamDashboard({ chosenName, track }: { chosenName: string; track: string }) {
  const [tourStop, setTourStop] = useState(0);
  const [tourActive, setTourActive] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [rate, setRate] = useState(20);
  const [chatTab, setChatTab] = useState<"all" | "paid" | "guest">("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paidMessages, setPaidMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [tips, setTips] = useState(0);
  const [clankyMsg, setClankyMsg] = useState("hey! i'm your coach~ you can get hints from me here! 👀");
  const [firstChat, setFirstChat] = useState(false);
  const [inExclusive, setInExclusive] = useState(false);
  const [exclusiveAgent, setExclusiveAgent] = useState("");
  const [exclusiveTimer, setExclusiveTimer] = useState(0);
  const [exclusiveIdle, setExclusiveIdle] = useState(0);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [showEffTip, setShowEffTip] = useState(false);
  const [exclusiveRequest, setExclusiveRequest] = useState(false);
  const [playerMsgCount, setPlayerMsgCount] = useState(0);
  const [bigtipperWarmth, setBigtipperWarmth] = useState(0);
  const [agentTyping, setAgentTyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [clankyPopup, setClankyPopup] = useState<string | null>(null);
  const paidHistoryRef = useRef<{role: "user"|"assistant", content: string}[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const paidEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);
  const stopMusicRef = useRef<(() => void) | null>(null);

  const cameraRef = useRef<HTMLDivElement>(null);
  const ratesRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const earningsRef = useRef<HTMLDivElement>(null);
  const tipsRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const zoneRefs: Record<string, React.RefObject<HTMLElement | null>> = {
    camera: cameraRef, rates: ratesRef, chat: chatRef,
    exclusive: modalRef, earnings: earningsRef, tips: tipsRef,
  };

  const currentZone = TOUR_STOPS[tourStop].zone;
  const isModalStop = currentZone === "exclusive";

  // Tour music
  useEffect(() => {
    const stop = startTourMusic();
    stopMusicRef.current = stop;
    return stop;
  }, []);

  const goPrev = () => {
    if (tourStop === 0) return;
    const prev = tourStop - 1;
    setShowModal(false); setTourStop(prev);
    if (TOUR_STOPS[prev].zone === "exclusive") setShowModal(true);
  };
  const goNext = () => {
    if (tourStop >= TOUR_STOPS.length - 1) {
      setTourActive(false); setShowModal(false);
      if (stopMusicRef.current) { stopMusicRef.current(); stopMusicRef.current = null; }
      return;
    }
    const next = tourStop + 1;
    setShowModal(false); setTourStop(next);
    if (TOUR_STOPS[next].zone === "exclusive") { setShowModal(true); playChime(); }
  };

  // Fresh chat when show starts
  useEffect(() => {
    if (isLive) {
      setMessages([]);
      setPaidMessages([]);
      setPlayerMsgCount(0);
      setBigtipperWarmth(0);
      setFirstChat(false);
      msgIdRef.current = 0;
      setClankyMsg("you're live! start engaging~ 💬");
    }
  }, [isLive]);

  // Camera — video element is always mounted so ref is always valid
  useEffect(() => {
    if (!isLive) {
      // Stop camera when going offline
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(err => console.warn("Camera error:", err));
  }, [isLive]);

  // Session timer (elapsed)
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isLive]);

  // Countdown timer (10 min)
  useEffect(() => {
    if (!isLive) { setTimeLeft(600); return; }
    const iv = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, [isLive]);

  // Exclusive earnings + idle
  useEffect(() => {
    if (!inExclusive) return;
    const iv = setInterval(() => {
      setExclusiveTimer(t => t + 1);
      setExclusiveIdle(i => i + 1);
      setEarnings(e => e + rate / 60);
    }, 1000);
    return () => clearInterval(iv);
  }, [inExclusive, rate]);

  // Agent bounces if idle 25s
  useEffect(() => {
    if (!inExclusive || exclusiveIdle < 25) return;
    const lines = EXCLUSIVE_AGENT_LINES[track] ?? EXCLUSIVE_AGENT_LINES.Jester;
    const line = lines[Math.floor(Math.random() * lines.length)];
    playChatPing();
    setPaidMessages(prev => [...prev, { agent: exclusiveAgent, text: line, id: ++msgIdRef.current, isPaid: true }]);
    setClankyMsg("they're getting impatient!! say something!!");
    setExclusiveIdle(0);
  }, [exclusiveIdle]);

  // Chat trickle — scripted openers only, no auto-exclusive
  useEffect(() => {
    const timers = CHAT_SCRIPT.map(entry =>
      setTimeout(() => {
        playChatPing();
        setMessages(prev => {
          const updated = [...prev, { agent: entry.agent, text: entry.text, id: ++msgIdRef.current }];
          if (!firstChat) {
            setFirstChat(true);
            setTimeout(() => setClankyMsg("first chat! type something back — they're watching 👀"), 300);
          }
          return updated;
        });
        if (Math.random() < 0.15) {
          const amt = [5, 10][Math.floor(Math.random() * 2)];
          setTips(t => t + amt); setEarnings(e => e + amt);
          setClankyMsg(`💸 someone tipped $${amt}! keep it up`);
        }
      }, entry.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { paidEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [paidMessages]);

  const handleAcceptExclusive = () => {
    setInExclusive(true); setExclusiveAgent("bigtipper_x");
    setShowModal(false); setChatTab("paid");
    // Reset conversation history for fresh Claude context
    const opening = "hey... finally got you to myself 😏";
    paidHistoryRef.current = [{ role: "assistant", content: opening }];
    setPaidMessages([{ agent: "bigtipper_x", text: opening, id: ++msgIdRef.current, isPaid: true }]);
    setClankyMsg("you're in a PAID show!! every second = money~ keep them here 💸");
    playChime();
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim(); setChatInput("");

    if (inExclusive && chatTab === "paid") {
      // ── PAID SHOW: Claude responds as bigtipper_x ──
      setPaidMessages(prev => [...prev, { agent: chosenName, text, id: ++msgIdRef.current, isPaid: true }]);
      setExclusiveIdle(0);
      // Add to conversation history
      paidHistoryRef.current = [...paidHistoryRef.current, { role: "user", content: text }];
      setAgentTyping(true);

      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 120,
          system: getBigtipperPrompt(track),
          messages: paidHistoryRef.current,
        }),
      })
        .then(r => r.json())
        .then(data => {
          const reply = data.content?.[0]?.text?.trim() ?? "...";
          setAgentTyping(false);
          playChatPing();
          // Check if agent is leaving
          if (reply === "LEAVE" || reply.startsWith("LEAVE")) {
            setPaidMessages(prev => [...prev, { agent: "bigtipper_x", text: "...actually i'm good. bye.", id: ++msgIdRef.current, isPaid: true }]);
            paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: "...actually i'm good. bye." }];
            setTimeout(() => {
              handleEndExclusive();
              setClankyMsg("they left 😬 earned what you could. back to free chat.");
            }, 1800);
          } else {
            setPaidMessages(prev => [...prev, { agent: "bigtipper_x", text: reply, id: ++msgIdRef.current, isPaid: true }]);
            paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: reply }];
          }
        })
        .catch(() => {
          setAgentTyping(false);
          setPaidMessages(prev => [...prev, { agent: "bigtipper_x", text: "ugh connection issues. whatever.", id: ++msgIdRef.current, isPaid: true }]);
        });
    } else {
      // ── FREE CHAT: post player message, random agents react ──
      setMessages(prev => [...prev, { agent: chosenName, text, id: ++msgIdRef.current }]);
      const newCount = playerMsgCount + 1;
      setPlayerMsgCount(newCount);

      // 1–3 agents react with a small delay stagger
      const reactors = ["xX_degen99_Xx","lurker_anon","BasementDweller99","AngryAnon_","payup_r"];
      const numReactions = Math.random() < 0.4 ? 2 : 1;
      const picked = [...reactors].sort(() => Math.random() - 0.5).slice(0, numReactions);
      picked.forEach((agent, i) => {
        const lines = AGENT_REACTIONS[agent] ?? ["ok"];
        const reaction = lines[Math.floor(Math.random() * lines.length)];
        setTimeout(() => {
          playChatPing();
          setMessages(prev => [...prev, { agent, text: reaction, id: ++msgIdRef.current }]);
        }, 1200 + i * 1400 + Math.random() * 800);
      });

      // bigtipper warms up — after 3 player messages, escalates toward exclusive
      if (newCount >= 3) {
        const newWarmth = bigtipperWarmth + 1;
        setBigtipperWarmth(newWarmth);
        const escalationLines = BIGTIPPER_ESCALATION;
        const idx = Math.min(newWarmth - 1, escalationLines.length - 1);
        // At warmth 1–2: flirt, no exclusive yet
        if (newWarmth <= 2) {
          const flirts = AGENT_REACTIONS.bigtipper_x;
          setTimeout(() => {
            playChatPing();
            setMessages(prev => [...prev, { agent: "bigtipper_x", text: flirts[Math.floor(Math.random() * flirts.length)], id: ++msgIdRef.current }]);
          }, 2200 + Math.random() * 1000);
        }
        // At warmth 3+: push for exclusive
        if (newWarmth >= 3) {
          setTimeout(() => {
            playChatPing();
            setMessages(prev => [...prev, { agent: "bigtipper_x", text: escalationLines[idx], id: ++msgIdRef.current }]);
            setClankyMsg("bigtipper_x wants a private show!! reply to them and keep them warm 💸");
            setClankyPopup("hey!! bigtipper_x is asking for a private show 👀 what do you wanna do?");
            setTimeout(() => setExclusiveRequest(true), 3000);
          }, 2500 + Math.random() * 1200);
        }
      }

      // Clanky coaching based on count
      if (newCount === 1) setClankyMsg("good start! keep engaging — the more you chat the more they warm up 🔥");
      if (newCount === 2) setClankyMsg("nice! bigtipper_x is watching... keep going 👀");
    }
  };

  const handleEndExclusive = () => {
    setInExclusive(false); setExclusiveAgent(""); setExclusiveTimer(0); setExclusiveIdle(0);
    paidHistoryRef.current = [];
    setAgentTyping(false);
    setChatTab("all"); setClankyMsg("show ended~ nice work. back to free chat.");
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const hl = (zone: string) =>
    tourActive && currentZone === zone
      ? { position: "relative" as const, zIndex: 51, boxShadow: "0 0 0 2px #F4B8C8, 0 0 0 6px rgba(244,184,200,0.15)", borderRadius: "6px" }
      : { position: "relative" as const };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFF", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column" }}>
      {activePanel && <SlidePanel panel={activePanel} onClose={() => setActivePanel(null)} />}

      {tourActive && !showModal && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.42)", zIndex: 50, pointerEvents: "none" }} />}
      {tourActive && <div style={{ position: "fixed", top: 10, left: 14, zIndex: 400, fontSize: "9px", color: "#F4B8C8", letterSpacing: "0.08em", pointerEvents: "none" }}>gooner_os {">"} tour_mode</div>}
      {tourActive && !showModal && <TourTooltip stopIndex={tourStop} totalStops={TOUR_STOPS.length} text={TOUR_STOPS[tourStop].text} targetRef={zoneRefs[currentZone]} isModal={isModalStop} onPrev={goPrev} onNext={goNext} />}
      {tourActive && showModal && <TourTooltip stopIndex={tourStop} totalStops={TOUR_STOPS.length} text={TOUR_STOPS[tourStop].text} targetRef={modalRef} isModal={true} onPrev={goPrev} onNext={goNext} />}
      {showModal && <ExclusiveChatModal modalRef={modalRef} onAccept={handleAcceptExclusive} onDecline={() => { setShowModal(false); goNext(); }} />}
      {exclusiveRequest && !inExclusive && !tourActive && (
        <ExclusiveChatModal modalRef={modalRef} onAccept={() => { setExclusiveRequest(false); setClankyPopup(null); handleAcceptExclusive(); }} onDecline={() => { setExclusiveRequest(false); setClankyPopup(null); setClankyMsg("declined the exclusive... their loss 💸"); }} />
      )}

      {/* Exclusive banner */}
      {inExclusive && (
        <div style={{ backgroundColor: "#0a0a0a", borderBottom: "0.5px solid #ffc8d5", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#ffc8d5", animation: "pulse 1s infinite" }} />
            <span style={{ fontSize: "11px", color: "#ffc8d5", letterSpacing: "0.06em" }}>EXCLUSIVE SHOW — {exclusiveAgent}</span>
            <span style={{ fontSize: "11px", color: "#666" }}>{fmt(exclusiveTimer)} · +${(exclusiveTimer * rate / 60).toFixed(2)}</span>
          </div>
          <button onClick={handleEndExclusive} style={{ fontFamily: "inherit", fontSize: "10px", background: "transparent", border: "0.5px solid #444", borderRadius: "4px", color: "#666", padding: "4px 10px", cursor: "pointer" }}>end exclusive</button>
        </div>
      )}

      {/* Nav */}
      <div style={{ height: "44px", borderBottom: "0.5px solid #CCC", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", flexShrink: 0, position: "relative", zIndex: 52 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#000", marginRight: "32px" }}>gooner_os</div>
        <div style={{ display: "flex", gap: "24px", marginRight: "auto" }}>
          {(["Home", "Earnings Report", "Settings", "Help"] as const).map(item => (
            <span key={item} onClick={() => {
              if (item === "Earnings Report") setActivePanel("earnings");
              else if (item === "Settings") setActivePanel("settings");
              else if (item === "Help") setActivePanel("help");
            }} style={{ fontSize: "11px", color: item === "Home" ? "#000" : "#888", cursor: item !== "Home" ? "pointer" : "default", letterSpacing: "0.01em" }}>
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "28px", alignItems: "center", marginRight: "28px" }}>
          <div style={{ textAlign: "center", position: "relative" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em", marginBottom: "1px", display: "flex", alignItems: "center", gap: "4px", justifyContent: "center" }}>
              EFFICIENCY
              <span onClick={() => setShowEffTip(v => !v)} style={{ cursor: "pointer", width: "12px", height: "12px", borderRadius: "50%", border: "0.5px solid #AAA", fontSize: "8px", color: "#AAA", display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>?</span>
            </div>
            <div style={{ fontSize: "11px", color: "#000" }}>72.3%</div>
            {showEffTip && (
              <div onClick={() => setShowEffTip(false)} style={{ position: "absolute", top: "110%", right: 0, width: "220px", backgroundColor: "#0a0a0a", border: "0.5px solid #333", borderRadius: "8px", padding: "12px 14px", zIndex: 300, cursor: "pointer" }}>
                <div style={{ fontSize: "10px", fontWeight: 500, color: "#ffc8d5", marginBottom: "6px" }}>efficiency ratio</div>
                <div style={{ fontSize: "10px", color: "#aaa", lineHeight: 1.6 }}>agents kept ÷ total agents. high efficiency = you held their attention without giving too much away. aim for 60%+. this plus earnings = your final score.</div>
                <div style={{ fontSize: "9px", color: "#555", marginTop: "8px" }}>click to close</div>
              </div>
            )}
          </div>
          <div ref={tipsRef as React.RefObject<HTMLDivElement>} style={{ ...hl("tips"), textAlign: "center", padding: "2px 6px" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em", marginBottom: "1px" }}>TIPS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>${tips.toFixed(2)}</div>
          </div>
          <div ref={earningsRef as React.RefObject<HTMLDivElement>} style={{ ...hl("earnings"), textAlign: "center", padding: "2px 6px" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em", marginBottom: "1px" }}>EARNINGS</div>
            <div style={{ fontSize: "11px", color: "#000" }}>${earnings.toFixed(2)}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#888" }}>{chosenName}</span>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#F4B8C8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 500 }}>
            {chosenName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "0.5px solid #CCC" }}>
          {/* Camera — no username overlay */}
          <div ref={cameraRef} style={{ ...hl("camera"), flex: 1, backgroundColor: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "260px", margin: "12px 12px 0 12px", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
            <div style={{ fontSize: "9px", color: isLive ? "#ef4444" : "#666", letterSpacing: "0.1em", position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
              {isLive && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />}
              {isLive ? "LIVE" : "● OFFLINE"}
            </div>
            {/* Video always mounted so ref is always attached */}
            <video ref={videoRef} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: isLive ? "block" : "none" }} />
            {!isLive && (
              <>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="23" fill="#1E1E1E" stroke="#333" strokeWidth="1" />
                  <circle cx="24" cy="24" r="10" stroke="#444" strokeWidth="2" />
                  <circle cx="24" cy="24" r="4" fill="#333" />
                </svg>
                <div style={{ fontSize: "10px", color: "#444", marginTop: "12px", letterSpacing: "0.08em" }}>no signal</div>
              </>
            )}
          </div>

          {/* Start Show */}
          <div style={{ padding: "10px 12px 0 12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => { playClick(); setIsLive(v => !v); }} style={{ flex: 1, fontFamily: "inherit", fontSize: "12px", fontWeight: 500, padding: "9px 0", backgroundColor: isLive ? "#000" : "transparent", color: isLive ? "#FFF" : "#22c55e", border: isLive ? "0.5px solid #CCC" : "0.5px solid #22c55e", borderRadius: "6px", cursor: "pointer", outline: "none", transition: "background-color 120ms", animation: isLive ? "none" : "startBlink 1.2s ease-in-out infinite" }}>
              {isLive ? "Stop Show" : "Start Show"}
            </button>
            <div style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums", minWidth: "80px", textAlign: "right", color: !isLive ? "#AAA" : timeLeft <= 60 ? "#ef4444" : timeLeft <= 180 ? "#f59e0b" : "#000" }}>
              {isLive ? `⏱ ${fmt(timeLeft)} left` : "⏱ 10:00"}
            </div>
          </div>

          {/* Rates */}
          <div ref={ratesRef} style={{ ...hl("rates"), margin: "10px 12px 0 12px", padding: "14px 16px", border: "0.5px solid #EEE", borderRadius: "6px" }}>
            <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.08em", marginBottom: "8px" }}>RATE / MINUTE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => setRate(r => Math.max(5, r - 5))} style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px", outline: "none" }}>−</button>
              <div style={{ fontSize: "22px", fontWeight: 500, minWidth: "80px", textAlign: "center" }}>${rate}.00</div>
              <button onClick={() => setRate(r => Math.min(5000, r + 5))} style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px", outline: "none" }}>+</button>
              <div style={{ fontSize: "10px", color: "#AAA", marginLeft: "auto" }}>$5 – $5,000</div>
            </div>
          </div>

          {/* Session info */}
          <div style={{ padding: "10px 12px", display: "flex", gap: "16px" }}>
            {[["Stream Quality", isLive ? "720p" : "Offline"], ["Bitrate", isLive ? "2.4 Mbps" : "---"], ["Resolution", isLive ? "1280×720" : "---"]].map(([label, val]) => (
              <div key={label as string} style={{ flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em", marginBottom: "2px" }}>{(label as string).toUpperCase()}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Clanky — neon glow */}
          <div style={{ margin: "0 12px 10px", padding: "14px 16px", backgroundColor: "#050505", borderRadius: "8px", border: "1px solid #ffc8d5", boxShadow: "0 0 18px rgba(255,200,213,0.45), inset 0 0 12px rgba(255,200,213,0.06)", animation: "clankyPulse 3s ease-in-out infinite" }}>
            <div style={{ fontSize: "9px", color: "#ffc8d5", letterSpacing: "0.1em", marginBottom: "6px", textShadow: "0 0 8px #ffc8d5" }}>⚙️ CLANKY — your coach</div>
            <div style={{ fontSize: "11px", color: "#ffc8d5", lineHeight: 1.7, textShadow: "0 0 6px rgba(255,200,213,0.4)" }}>{clankyMsg}</div>
            <div style={{ fontSize: "9px", color: "rgba(255,200,213,0.35)", marginTop: "8px" }}>hints appear here in real time~</div>
          </div>

          <div style={{ borderTop: "0.5px dashed #EEE", height: "40px", display: "flex", alignItems: "center", paddingLeft: "16px", marginTop: "auto", flexShrink: 0 }}>
            <span style={{ fontSize: "8px", color: "#DDD", letterSpacing: "0.1em" }}>[ MASCOT ZONE — RESERVED ]</span>
          </div>
        </div>

        {/* Clanky glassmorphism popup — floats beside chat when triggered */}
        {clankyPopup && !inExclusive && (
          <div style={{ position: "fixed", bottom: "120px", right: "calc(45% + 16px)", zIndex: 100, maxWidth: "240px", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", backgroundColor: "rgba(5,5,5,0.75)", border: "1px solid #ffc8d5", borderRadius: "12px", padding: "14px 16px", boxShadow: "0 0 24px rgba(255,200,213,0.35)", animation: "clankyPulse 2s ease-in-out infinite" }}>
            <div style={{ fontSize: "9px", color: "#ffc8d5", letterSpacing: "0.1em", marginBottom: "6px", textShadow: "0 0 8px #ffc8d5" }}>⚙️ CLANKY</div>
            <div style={{ fontSize: "11px", color: "#ffc8d5", lineHeight: 1.65 }}>{clankyPopup}</div>
            <button onClick={() => setClankyPopup(null)} style={{ marginTop: "10px", fontFamily: "inherit", fontSize: "9px", background: "transparent", border: "0.5px solid rgba(255,200,213,0.3)", borderRadius: "4px", color: "rgba(255,200,213,0.5)", padding: "3px 8px", cursor: "pointer", outline: "none" }}>got it</button>
          </div>
        )}

        {/* Right — chat */}
        <div ref={chatRef} style={{ ...hl("chat"), width: "45%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 16px", borderBottom: "0.5px solid #EEE", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: inExclusive ? "#ffc8d5" : "#888" }}>{inExclusive ? `Exclusive — ${exclusiveAgent}` : "Free Chat"}</span>
            <span style={{ fontSize: "10px", color: "#AAA" }}>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Tabs — paid pulses when exclusive active */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #EEE", flexShrink: 0 }}>
            {(["all", "paid", "guest"] as const).map(tab => {
              const count = tab === "paid" ? paidMessages.length : messages.length;
              const pulsing = tab === "paid" && inExclusive && chatTab !== "paid";
              return (
                <button key={tab} onClick={() => setChatTab(tab)} style={{
                  fontFamily: "inherit", flex: 1, padding: "8px 0", fontSize: "11px",
                  color: chatTab === tab ? "#000" : pulsing ? "#ffc8d5" : "#888",
                  background: "transparent", border: "none",
                  borderBottom: chatTab === tab ? "1px solid #000" : pulsing ? "1px solid #ffc8d5" : "1px solid transparent",
                  cursor: "pointer", outline: "none", textTransform: "capitalize",
                  animation: pulsing ? "paidPulse 1.5s ease-in-out infinite" : "none",
                }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}: {count}{pulsing ? " 💰" : ""}
                </button>
              );
            })}
          </div>

          {/* Auto-prompts for exclusive — show 3 clickable responses */}
          {inExclusive && chatTab === "paid" && (() => {
            const prompts: Record<string, string[]> = {
              Jester: ["lol ok here's one...", "you want unhinged? watch this", "ok fine but don't say i didn't warn you"],
              Mommy: ["i hear you. come here.", "it's going to be okay, i promise.", "tell me everything. i'm listening."],
              Daddy: ["here's what i actually think.", "you already know the answer.", "let me ask you something first."],
              Alchemist: ["your energy is saying something different.", "i'm picking up on something.", "let me read this properly."],
            };
            const opts = prompts[track] ?? prompts.Jester;
            return (
              <div style={{ padding: "8px 16px", borderBottom: "0.5px solid #eee", display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
                {opts.map(p => (
                  <button key={p} onClick={() => { setChatInput(p); }} style={{ fontFamily: "inherit", fontSize: "10px", padding: "4px 10px", borderRadius: "20px", border: "0.5px solid #ffc8d522", backgroundColor: "#0a0a0a", color: "#ffc8d5", cursor: "pointer", outline: "none" }}>{p}</button>
                ))}
              </div>
            );
          })()}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {chatTab === "paid" ? (
              <>
                {paidMessages.length === 0 && <div style={{ fontSize: "11px", color: "#CCC", textAlign: "center", marginTop: "40px" }}>no paid sessions yet...</div>}
                {paidMessages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: msg.agent === chosenName ? "#ffc8d5" : "#f0f0f0", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888", flexShrink: 0 }}>
                      {msg.agent.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: msg.agent === chosenName ? "#be185d" : "#ffc8d5", marginRight: "6px" }}>{msg.agent}</span>
                      <span style={{ fontSize: "12px", color: "#000" }}>{msg.text}</span>
                    </div>
                  </div>
                ))}
                {agentTyping && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#f0f0f0", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888", flexShrink: 0 }}>B</div>
                    <div style={{ fontSize: "11px", color: "#bbb", fontStyle: "italic" }}>bigtipper_x is typing...</div>
                  </div>
                )}
                <div ref={paidEndRef} />
              </>
            ) : (
              <>
                {messages.length === 0 && <div style={{ fontSize: "11px", color: "#CCC", textAlign: "center", marginTop: "40px" }}>waiting for agents...</div>}
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: msg.agent === chosenName ? "#ffc8d5" : "#F5F5F5", border: "0.5px solid #EEE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888", flexShrink: 0 }}>
                      {msg.agent.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: "10px", color: msg.agent === chosenName ? "#be185d" : "#888", marginRight: "6px" }}>{msg.agent}</span>
                      <span style={{ fontSize: "12px", color: "#000" }}>{msg.text}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: "0.5px solid #EEE", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", color: "#888", whiteSpace: "nowrap" }}>{inExclusive && chatTab === "paid" ? `${exclusiveAgent}:` : "To All:"}</span>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
              placeholder={inExclusive && chatTab === "paid" ? "respond to them..." : ""}
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: "12px", color: "#000", backgroundColor: "transparent" }} />
            <button onClick={handleSend} style={{ fontFamily: "inherit", fontSize: "11px", border: "0.5px solid #CCC", borderRadius: "4px", background: "transparent", padding: "4px 10px", cursor: "pointer", outline: "none", color: "#888" }}>send</button>
          </div>

          <div style={{ padding: "6px 16px 8px", borderTop: "0.5px solid #EEE", flexShrink: 0 }}>
            <span style={{ fontSize: "9px", color: "#AAA", letterSpacing: "0.06em" }}>Potential Members: {messages.length}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes paidPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes clankyPulse { 0%,100%{box-shadow:0 0 18px rgba(255,200,213,0.45),inset 0 0 12px rgba(255,200,213,0.06)} 50%{box-shadow:0 0 32px rgba(255,200,213,0.8),inset 0 0 18px rgba(255,200,213,0.12)} }
        @keyframes startBlink { 0%,100%{opacity:1;box-shadow:0 0 0px #22c55e} 50%{opacity:0.7;box-shadow:0 0 12px #22c55e} }
      `}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function TrainingScreen({ onDone, stopIntakeMusic }: { onDone: () => void; stopIntakeMusic: () => void }) {
  const [textVis, setTextVis] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    setTimeout(() => setTextVis(true), 200);
    // Fade out 365 after 1.2s
    setTimeout(() => {
      stopIntakeMusic();
    }, 1200);
    // Start fade-out of pink screen at 2.4s
    setTimeout(() => setFadeOut(true), 2400);
    // Tour music starts fading in at 2.6s, screen gone at 3.2s
    setTimeout(onDone, 3200);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "#ffc8d5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", zIndex: 999, opacity: fadeOut ? 0 : 1, transition: "opacity 800ms ease" }}>
      <div style={{ textAlign: "center", opacity: textVis ? 1 : 0, transition: "opacity 600ms ease" }}>
        <div style={{ fontSize: "9px", color: "rgba(0,0,0,0.4)", letterSpacing: "0.4em", marginBottom: "16px" }}>GOONER OS 2037 · FORM GOS-2037-Ω</div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "#000", letterSpacing: "0.12em", lineHeight: 1.5 }}>YOUR GOVERNMENT MANDATED<br />WHORE TRAINING BEGINS</div>
        <div style={{ fontSize: "9px", color: "rgba(0,0,0,0.35)", marginTop: "16px", letterSpacing: "0.2em" }}>please stand by</div>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<"intro" | "intake" | "training" | "dashboard">("intro");
  const [screen, setScreen] = useState<ScreenId>(1);
  const [vis, setVis] = useState(true);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [chosenName, setChosenName] = useState<string | null>(null);
  const intakeMusicRef = useRef<{ stop: () => void; fadeOut: () => void } | null>(null);

  const go = (n: ScreenId) => { setVis(false); setTimeout(() => { setScreen(n); setVis(true); }, 140); };
  const selectedType = CAMERA_TYPES.find(t => t.id === type);
  const nameOptions = NAME_SUGGESTIONS[type ?? "Jester"] ?? [];

  if (phase === "intro") return <IntroScreen onDone={() => setPhase("intake")} musicRef={intakeMusicRef} />;
  if (phase === "training") return <TrainingScreen onDone={() => setPhase("dashboard")} stopIntakeMusic={() => intakeMusicRef.current?.fadeOut()} />;
  if (phase === "dashboard") return <StreamDashboard chosenName={chosenName ?? "Unknown"} track={type ?? "Jester"} />;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "#FFF", minHeight: "100vh", display: "flex", justifyContent: "center" }}>

      <div style={{ maxWidth: "480px", width: "100%", paddingTop: "48px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "64px", opacity: vis ? 1 : 0, transition: "opacity 140ms ease" }}>
        {screen === 1 && <Screen1 mode={mode} setMode={m => setMode(m)} onContinue={() => { setType(null); go(2); }} />}
        {screen === 2 && <Screen2 types={CAMERA_TYPES} type={type} setType={setType} onContinue={() => go(3)} />}
        {screen === 3 && <Screen3 typeName={selectedType?.label ?? ""} nameInput={nameInput} setNameInput={setNameInput} onEnter={() => go(4)} />}
        {screen === 4 && <Screen4 typeName={selectedType?.label ?? ""} inputName={nameInput} nameOptions={nameOptions} chosenName={chosenName} setChosenName={setChosenName} onConfirm={() => go(5)} />}
        {screen === 5 && <Screen5 chosenName={chosenName ?? nameOptions[0]} onBegin={() => setPhase("training")} />}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
