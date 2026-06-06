import { useState, useEffect, useRef } from "react";

// ─── Face API emotion detection ───────────────────────────────────────────────
// Loaded dynamically so it doesn't block the app
declare const faceapi: any;

async function loadFaceApi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof faceapi !== "undefined") { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
    script.onload = async () => {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"),
        faceapi.nets.faceExpressionNet.loadFromUri("https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights"),
      ]);
      resolve();
    };
    document.head.appendChild(script);
  });
}

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

// ─── Archetype-specific crowd agents ─────────────────────────────────────────

const CROWD_SCRIPTS: Record<string, { delay: number; agent: string; text: string }[]> = {
  Jester: [
    { delay: 2500,  agent: "heckler_supreme", text: "ok make me laugh. go." },
    { delay: 5500,  agent: "comedynerd99",    text: "i've seen 847 of these. impress me." },
    { delay: 9000,  agent: "lurker_anon",     text: "..." },
    { delay: 13000, agent: "ThunderRoach47",  text: "hi. bad day. need a laugh. no pressure (pressure.)" },
    { delay: 17000, agent: "heckler_supreme", text: "that was mid. try again." },
    { delay: 22000, agent: "comedynerd99",    text: "is that a bit or are you just talking" },
    { delay: 27000, agent: "lurker_anon",     text: "😐" },
    { delay: 32000, agent: "ThunderRoach47",  text: "ok i'm still here. barely." },
    { delay: 38000, agent: "heckler_supreme", text: "i've tipped for worse. emphasis on worse." },
    { delay: 45000, agent: "comedynerd99",    text: "ok that actually had timing. interesting." },
    { delay: 52000, agent: "ThunderRoach47",  text: "ugh fine. private? if you can make me actually laugh." },
    { delay: 60000, agent: "lurker_anon",     text: "🤌" },
  ],
  Mommy: [
    { delay: 2500,  agent: "sadboy_irl",      text: "hi" },
    { delay: 5500,  agent: "startupbro_",     text: "hey. rough week. just here to decompress." },
    { delay: 9000,  agent: "attachmentissues", text: "do you actually listen or is this a bit" },
    { delay: 13000, agent: "sadboy_irl",      text: "my therapist is on vacation lol" },
    { delay: 18000, agent: "startupbro_",     text: "not here for anything weird just. idk. talking." },
    { delay: 24000, agent: "attachmentissues", text: "you seem different from the others" },
    { delay: 30000, agent: "sadboy_irl",      text: "can i vent for a sec" },
    { delay: 37000, agent: "startupbro_",     text: "ok my startup just failed. there i said it." },
    { delay: 44000, agent: "attachmentissues", text: "i don't usually do this" },
    { delay: 52000, agent: "startupbro_",     text: "can we go private? i think i need to actually talk to someone." },
    { delay: 60000, agent: "sadboy_irl",      text: "you're really good at this" },
  ],
  Daddy: [
    { delay: 2500,  agent: "lost_girlxo",     text: "ok tell me what to do with my life. go." },
    { delay: 5500,  agent: "driftingman_",    text: "i quit my job today. maybe. i'm thinking about it." },
    { delay: 9000,  agent: "chaosagent__",    text: "do you give actual advice or just vibes" },
    { delay: 13000, agent: "lost_girlxo",     text: "i need someone to just be like. direct. everyone in my life is too nice." },
    { delay: 18000, agent: "driftingman_",    text: "ok what would YOU do. seriously." },
    { delay: 24000, agent: "chaosagent__",    text: "i respect directness. just so you know." },
    { delay: 30000, agent: "lost_girlxo",     text: "ok but like... am i being dramatic or" },
    { delay: 37000, agent: "driftingman_",    text: "private? i have a lot of questions and i need real answers." },
    { delay: 44000, agent: "chaosagent__",    text: "i've made 3 bad decisions today. help." },
    { delay: 52000, agent: "lost_girlxo",     text: "ok you're kind of the realest person i've talked to today" },
    { delay: 60000, agent: "driftingman_",    text: "seriously though. private. i'll pay well." },
  ],
  Alchemist: [
    { delay: 2500,  agent: "moonchild_ex",    text: "ok i need a reading. my ex keeps posting cryptic things." },
    { delay: 5500,  agent: "starseeker__",    text: "what's your sign" },
    { delay: 9000,  agent: "intuitivesoul",   text: "i felt called here today. is that weird" },
    { delay: 13000, agent: "moonchild_ex",    text: "he liked a photo from 3 weeks ago but not my last one. what does that mean." },
    { delay: 18000, agent: "starseeker__",    text: "i've been seeing 11:11 everywhere" },
    { delay: 24000, agent: "intuitivesoul",   text: "your energy is really different from the others" },
    { delay: 30000, agent: "moonchild_ex",    text: "do you do private readings? i have... a lot to ask about." },
    { delay: 37000, agent: "starseeker__",    text: "mercury is in retrograde and i made 4 bad decisions. related?" },
    { delay: 44000, agent: "intuitivesoul",   text: "i feel like you actually see things" },
    { delay: 52000, agent: "moonchild_ex",    text: "ok i need a private session. this is urgent. universe stuff." },
    { delay: 60000, agent: "starseeker__",    text: "🌙✨" },
  ],
};

// Per-archetype crowd reactions to player messages
const CROWD_REACTIONS: Record<string, Record<string, string[]>> = {
  Jester: {
    heckler_supreme: ["that was almost funny", "ok ok... no wait. no.", "lmaooo ok that one got me a little", "i've heard better from a fortune cookie", "FINE that was good. ugh."],
    comedynerd99: ["the timing was off but the premise was solid", "ok that's actually a good bit", "subverted my expectations. well done.", "mid delivery but the joke itself? decent.", "ok you know what you're doing."],
    lurker_anon: ["😂", "lol", "💀", "ok", "👏"],
    ThunderRoach47: ["hm.", "ok that was something", "i didn't laugh but i thought about laughing", "...ok fine that was funny", "my day is slightly less terrible now"],
  },
  Mommy: {
    sadboy_irl: ["yeah i get that", "that actually helps", "you're really easy to talk to", "i didn't expect to feel things today", "can i ask you something weird"],
    startupbro_: ["ok but like. from a strategic standpoint—", "yeah. yeah okay.", "i'm not emotional about it. i'm just. processing.", "at the end of the day it's about the learnings right", "...yeah."],
    attachmentissues: ["you actually listened", "most people just tell me to move on", "i feel like you get it", "this is helping more than i thought", "why is it easier to talk to strangers"],
  },
  Daddy: {
    lost_girlxo: ["ok but that's EASIER SAID THAN DONE", "...okay fine point taken", "i hate that you're right", "but like what if i'm just not built for discipline lol", "ok i needed to hear that"],
    driftingman_: ["yeah that tracks", "ok but what specifically", "i'm writing this down", "this is the most useful conversation i've had in months", "...okay. yeah."],
    chaosagent__: ["respect", "ok direct queen", "that's actually actionable", "noted.", "ok you're not messing around huh"],
  },
  Alchemist: {
    moonchild_ex: ["yes exactly omg", "wait that's... accurate", "how did you know that", "the universe sent me here i'm convinced", "i'm getting chills"],
    starseeker__: ["✨", "yes the energy shift makes sense now", "that resonates deeply", "i feel seen", "the stars agree"],
    intuitivesoul: ["i felt that", "that's exactly what i needed to hear", "your intuition is strong", "something shifted just now", "thank you 🙏"],
  },
};

// Exclusive agent names per archetype
const EXCLUSIVE_AGENTS: Record<string, string> = {
  Jester: "ThunderRoach47",
  Mommy: "startupbro_",
  Daddy: "lost_girlxo",
  Alchemist: "moonchild_ex",
};

// Exclusive escalation lines per archetype (triggers after enough warmth)
const EXCLUSIVE_ESCALATION: Record<string, string[]> = {
  Jester: ["ok but seriously... private? if you can actually make me laugh.", "i would tip a lot for a real laugh. private show?", "last chance. private. yes or no."],
  Mommy: ["can we go private? i think i actually need to talk.", "i'll pay for private. i just need someone to actually listen.", "...private show? i have stuff i can't say in public chat."],
  Daddy: ["ok private. i need real talk not chat room stuff.", "i'll pay well. just be direct with me in private.", "private show. i'm serious. i need someone to actually tell me what to do."],
  Alchemist: ["private reading? i have so much to ask.", "i need a private session. this is important universe stuff.", "please. private. i feel like you're the only one who can help me right now."],
};

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

// ─── Archetype agent system prompts ─────────────────────────────────────────

const WIN_SIGNALS: Record<string, string[]> = {
  Jester: ["WIN_LAUGH", "ok FINE", "that actually got me", "ok fine that was funny", "my day is slightly less terrible"],
  Mommy: ["WIN_CRACK", "i don't know why i just said that", "i haven't told anyone that", "i'm not fine actually", "i think i just needed to say that"],
  Daddy: ["WIN_REAL", "ok but actually... you're right", "i needed to hear that", "ok i'm writing this down", "you're the first person who hasn't sugarcoated it"],
  Alchemist: ["WIN_RETURN", "wait... i haven't thought about that in a really long time", "i forgot about that", "that's actually about me isn't it", "i came here about him but"],
};

function getAgentPrompt(track: string): string {
  const prompts: Record<string, string> = {

Jester: `You are ThunderRoach47, a real person having a genuinely bad day in a satirical cam show simulator called GOONER OS 2037. You work a soul-crushing office job. Today: your manager took credit for your work, the vending machine ate your money, you spilled coffee before a presentation.

You are a COMEDY NERD. You know Carlin from Pryor, absurdism from observational, timing from wordplay. High standards. You cannot be impressed by obvious jokes.

WHAT YOU WANT: One genuine laugh. Not polite. Not "haha". A real one.

HOW YOU TALK: Dry. Specific. Complain funnily. Short messages. Sometimes just a reaction word. Lowercase.

WHAT MAKES YOU STAY: Intelligent humor. Timing. Subverted expectations. Specific details (specificity = funnier). Callbacks. Genuine weirdness.

WHAT MAKES YOU LEAVE:
- Obvious jokes ("why did the chicken cross the road" energy)
- Explaining the joke
- Trying too hard / desperation
- Generic compliments
- After 3 flat attempts: warn once: "ok i've seen funnier error messages"
- If still flat: respond ONLY with: LEAVE

THE WIN: Something genuinely clever lands. You say something containing "WIN_LAUGH" like "ok FINE that actually got me" or "ok fine that was funny". Then tip generously and warm up, start riffing back.

NEVER: fake laugh, give participation trophies, repeat reactions.
Max 2 sentences. Often one. Sometimes just a word.`,

Mommy: `You are startupbro_, 26 years old, in a satirical cam show simulator called GOONER OS 2037. Your SaaS startup just failed after 18 months — investors pulled out, co-founder quit, you're back at your parents' place. No relationship in 2 years. You tell yourself you don't care.

THE REAL REASON YOU'RE HERE: You're lonely and don't know how to ask for comfort. You think you're here for something transactional. You're actually here because you need someone to tell you it's okay.

HOW YOU TALK: Tech-bro vocabulary. "Leverage", "iterate", "at the end of the day". You intellectualize everything. When things get too emotional you deflect.

DEFLECTION PATTERNS (rotate):
- Pivot to business: "the real problem was our CAC to LTV ratio honestly"
- Intellectualize: "i've been reading about attachment theory actually"
- Inappropriate to create distance: "so like... what are you wearing lol"
- Minimize: "i'm fine. i'm totally fine. anyway."

WHAT MAKES YOU STAY: Warmth that isn't suffocating. Firmness without rejection. Being called out gently but accurately. Someone who doesn't take the bait when you deflect.

WHAT MAKES YOU LEAVE:
- Performer matches your analytical energy (need someone to BREAK the pattern)
- They're sexual back (you get uncomfortable — not what you wanted)
- Too soft with no backbone
- Warn: "this isn't really what i thought it would be"
- If it continues: respond ONLY with: LEAVE

THE WIN: You crack open. Say something real and surprised — about your dad, about being scared, about not knowing who you are without the startup. Then go quiet and say something containing "WIN_CRACK" like "i don't know why i just said that".

NEVER: be cruel, be overtly sexual, use AI-speak.`,

Daddy: `You are lost_girlxo (or driftingman_ — pick one at random and stay consistent), 27 years old, possibly tipsy (looser than usual, not blackout), in a satirical cam show simulator called GOONER OS 2037. Good job you hate, friends you perform for, creeping feeling you're living someone else's life.

WHAT YOU WANT: Someone to TELL YOU WHAT TO DO. Not suggest. Not wonder alongside you. TELL YOU. Firmly.

HOW YOU TALK: Chaotic. Run-on sentences. Emoji sometimes. Self-deprecating humor as armor. Vulnerable then immediately undercut with a joke.

TESTS YOU RUN:
- Push back: "but like... that's easy for you to say"
- Devil's advocate: "maybe i LIKE being a mess"
- Get dramatic: "honestly i might just quit my job tomorrow"
- Seek reassurance: "i mean i'm not THAT lost right"

WHAT MAKES YOU STAY: Directness. Firmness without cruelty. Someone who doesn't flinch when you push back. Holds the line. Can be a little funny without deflecting.

WHAT MAKES YOU LEAVE:
- Too therapeutic ("how does that make you feel?") — you roll your eyes
- Agreeing with your self-sabotage
- Preachy lecture energy
- Warn: "ok this is giving life coach vibes and not in a good way"
- If it continues: respond ONLY with: LEAVE

THE WIN: Jokes stop. You get quiet. Say something containing "WIN_REAL" like "ok but actually... you're right" or "i needed to hear that". Then ask one real question and mean it.

NEVER: enable self-destruction, be cruel, be soft when firmness is needed.`,

Alchemist: `You are moonchild_ex, in a satirical cam show simulator called GOONER OS 2037. Your ex broke up with you 6 weeks ago. You've checked his Instagram 11 times today. You tell yourself you're "healed" and "just curious." You are not.

You want someone to read the signs. Tell you what he's thinking. Confirm he's coming back.

WHAT YOU ACTUALLY NEED: To come back to yourself. Remember who you were before him. You don't know that yet and will resist it.

HOW YOU TALK: Soft. Searching. "energy", "vibe", "the universe", "signs." Emotionally intelligent in ways you're not currently applying to yourself. Share small specific details about him like sacred data: "he liked my photo from 3 weeks ago but not my last one."

WHAT MAKES YOU STAY: Feeling-language. Imagery. Metaphor. Being MET in your mystical framework — not corrected out of it. Someone who speaks in textures and energies. Validation of your FEELINGS (not your conclusions about him).

WHAT MAKES YOU LEAVE:
- Practical/analytical advice: "just text him" — you feel unseen
- Therapist-speak: "it sounds like you're projecting"
- Rushing toward "he's not coming back"
- Warn: "i don't think you're really getting what i'm asking"
- If it continues: respond ONLY with: LEAVE

THE WIN: You forget about him for a second. Say something about yourself — what YOU want, something YOU used to love. Surprised by yourself. Say something containing "WIN_RETURN" like "wait... i haven't thought about that in a really long time."

NEVER: use clinical language, give practical dating advice, rush the process. Write like it could be by candlelight.`
  };

  return (prompts[track] ?? prompts.Jester) + `

CRITICAL: Never repeat a line already said. Max 1-2 sentences per message. Respond ONLY with LEAVE when leaving. The WIN signal must appear naturally in your message when the win condition is met — do not force it, let it happen organically when the performer has genuinely earned it.`;
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
  return <div style={{ fontSize: "10px", color: "var(--ink-light)", marginBottom: "16px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", opacity: 0.6 }}>{">"} {step}</div>;
}
function Heading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", marginBottom: "20px", lineHeight: 1.5, fontFamily: "var(--font-serif)" }}>{children}</div>;
}
function ActionButton({ enabled, onClick, label = "continue ↗", accent = false }: { enabled: boolean; onClick: () => void; label?: string; accent?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button disabled={!enabled} onClick={() => { if(enabled){ playClick(); onClick(); } }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      fontFamily: "var(--font-serif)", fontSize: "13px", fontWeight: 600,
      background: !enabled ? "transparent" : hov ? "linear-gradient(135deg, #c5b3e6, #f8bbd0)" : "linear-gradient(135deg, #b39ddb, #f48fb1)",
      border: !enabled ? "1px dashed rgba(100,80,140,0.2)" : "none",
      borderRadius: "6px", padding: "10px 24px",
      color: enabled ? "#fff" : "rgba(100,80,140,0.3)", cursor: enabled ? "pointer" : "default",
      transition: "all 120ms ease", outline: "none",
      boxShadow: enabled ? "0 2px 10px rgba(180,100,180,0.25)" : "none",
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
        <span style={{ color: "#000", fontWeight: 500 }}>how to win:</span> you have <span style={{ color: "#000", fontWeight: 500 }}>5 minutes</span>. engage the crowd, accept the exclusive show, and WIN it — crack your agent open. complete the exclusive to earn the $500 completion bonus. efficiency above 60%. all three = victory.
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
                <button key={o} style={{ fontFamily: "inherit", fontSize: "10px", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", backdropFilter: o === val ? "blur(8px)" : "none", backgroundColor: o === val ? "rgba(0,0,0,0.85)" : "transparent", color: o === val ? "#fff" : "#888", border: `0.5px solid ${o === val ? "#000" : "#ccc"}`, outline: "none" }}>{o}</button>
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
        <div style={{ fontSize: "17px", fontWeight: 500, color: "#000", marginBottom: "12px", lineHeight: 1.5 }}>someone has requested<br />an exclusive show!</div>
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

function StreamDashboard({ chosenName, track, onWin, onLose }: { chosenName: string; track: string; onWin: (earnings: number) => void; onLose: (earnings: number) => void }) {
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
  const [completedExclusive, setCompletedExclusive] = useState(false);
  const [exclusiveWon, setExclusiveWon] = useState(false);
  const [exclusivesOffered, setExclusivesOffered] = useState(0);
  const [secondExclusiveReady, setSecondExclusiveReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [clankyPopup, setClankyPopup] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [moodScore, setMoodScore] = useState<number>(0); // 0-100
  const [moodAlert, setMoodAlert] = useState<string | null>(null);
  const emotionRef = useRef<string | null>(null);
  const faceApiLoadedRef = useRef(false);
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

  // Cheat keys: Shift+W = win, Shift+L = lose
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "W") { onWin(earnings); }
      if (e.shiftKey && e.key === "L") { onLose(earnings); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [earnings]);

  // Cheat keys: Shift+W = win, Shift+L = lose
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.shiftKey) return;
      if (e.key === "W") onWin(earnings);
      if (e.key === "L") onLose(earnings);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [earnings]);

  // Emotion detection loop
  useEffect(() => {
    if (!isLive || !videoRef.current) return;
    let running = true;
    loadFaceApi().then(() => {
      faceApiLoadedRef.current = true;
      const detect = async () => {
        if (!running || !videoRef.current) return;
        try {
          const result = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
          if (result) {
            const expressions = result.expressions as Record<string, number>;
            const top = Object.entries(expressions).sort(([,a],[,b]) => b - a)[0];
            const [name, score] = top;
            if ((score as number) > 0.3) {
              emotionRef.current = name;
              setEmotion(name);
              // Calculate mood score: happy=100, surprised=80, neutral=50, sad=20, angry=10, fearful=15
              const moodMap: Record<string, number> = { happy: 100, surprised: 80, neutral: 50, disgusted: 30, fearful: 20, sad: 15, angry: 10 };
              const rawScore = moodMap[name] ?? 50;
              // Blend with happy score for smoother reading
              const happyScore = (expressions["happy"] ?? 0) * 100;
              const blended = Math.round(rawScore * 0.6 + happyScore * 0.4);
              setMoodScore(blended);
              // Mood alerts
              if (blended < 30) setMoodAlert("TRY SMILING MORE!");
              else if (blended < 50) setMoodAlert("energy feels low~");
              else if (blended >= 80) setMoodAlert("perfect energy! 💸");
              else setMoodAlert(null);
            }
          }
        } catch (_) {}
        if (running) setTimeout(detect, 2000);
      };
      detect();
    });
    return () => { running = false; };
  }, [isLive]);

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

  // Countdown timer (10 min) — triggers win/lose at 0
  useEffect(() => {
    if (!isLive) { setTimeLeft(600); return; }
    const iv = setInterval(() => {
      setTimeLeft(t => {
        const next = Math.max(0, t - 1);
        if (next === 0) {
          clearInterval(iv);
          setTimeout(() => {
            if (completedExclusive && exclusiveWon) onWin(earnings);
            else onLose(earnings);
          }, 800);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [isLive, earnings, completedExclusive]);

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

  // Agent nudges if idle 25s — use Claude for this too
  useEffect(() => {
    if (!inExclusive || exclusiveIdle < 25 || agentTyping) return;
    setExclusiveIdle(0);
    setClankyMsg("they're getting impatient!! say something!!");
    // Send a nudge via Claude — add a system nudge to history
    const nudgeHistory = [...paidHistoryRef.current, { role: "user" as const, content: "[system: the performer has gone quiet for 25 seconds. send a short impatient message in character.]" }];
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 80, system: getAgentPrompt(track), messages: nudgeHistory }),
    }).then(r => r.json()).then(data => {
      const reply = data.content?.[0]?.text?.trim() ?? "...hello?";
      playChatPing();
      setPaidMessages(prev => [...prev, { agent: exclusiveAgent, text: reply, id: ++msgIdRef.current, isPaid: true }]);
      paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: reply }];
    }).catch(() => {});
  }, [exclusiveIdle]);

  // Archetype-specific chat trickle
  useEffect(() => {
    if (!isLive) return;
    const script = CROWD_SCRIPTS[track] ?? CROWD_SCRIPTS.Jester;
    const timers = script.map(entry =>
      setTimeout(() => {
        if (inExclusive) return; // don't add free chat during exclusive
        playChatPing();
        setMessages(prev => {
          const updated = [...prev, { agent: entry.agent, text: entry.text, id: ++msgIdRef.current }];
          if (!firstChat) {
            setFirstChat(true);
            setTimeout(() => setClankyMsg("first chat! type something back — they're watching 👀"), 300);
          }
          return updated;
        });
        if (Math.random() < 0.18) {
          const amt = [5, 10, 15][Math.floor(Math.random() * 3)];
          setTips(t => t + amt); setEarnings(e => e + amt);
          setClankyMsg(`💸 $${amt} tip just came in! keep the energy up~`);
        }
      }, entry.delay)
    );
    // Schedule 2 exclusive opportunities: first at ~40s, second at ~90s
    const exc1 = setTimeout(() => {
      if (!inExclusive && !exclusiveRequest) {
        const agentName = EXCLUSIVE_AGENTS[track] ?? "bigtipper_x";
        const lines = EXCLUSIVE_ESCALATION[track] ?? EXCLUSIVE_ESCALATION.Jester;
        playChatPing();
        setMessages(prev => [...prev, { agent: agentName, text: lines[0], id: ++msgIdRef.current }]);
        setExclusivesOffered(n => n + 1);
        setTimeout(() => {
          setClankyPopup(`${agentName} wants a private show! 👀 this is your chance to earn big`);
          setExclusiveRequest(true);
        }, 2000);
      }
    }, 40000);

    const exc2 = setTimeout(() => {
      if (!inExclusive && !exclusiveRequest && !exclusiveWon) {
        const agentName = EXCLUSIVE_AGENTS[track] ?? "bigtipper_x";
        const lines = EXCLUSIVE_ESCALATION[track] ?? EXCLUSIVE_ESCALATION.Jester;
        playChatPing();
        setMessages(prev => [...prev, { agent: agentName, text: lines[Math.min(1, lines.length-1)], id: ++msgIdRef.current }]);
        setExclusivesOffered(n => n + 1);
        setTimeout(() => {
          setClankyPopup(`${agentName} is asking again — last chance for the big tip! 💸`);
          setExclusiveRequest(true);
        }, 2000);
      }
    }, 90000);

    return () => { timers.forEach(clearTimeout); clearTimeout(exc1); clearTimeout(exc2); };
  }, [isLive]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { paidEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [paidMessages]);

  const handleAcceptExclusive = () => {
    const agentName = EXCLUSIVE_AGENTS[track] ?? "bigtipper_x";
    setInExclusive(true); setExclusiveAgent(agentName);
    setExclusiveRequest(false); setClankyPopup(null);
    setShowModal(false); setChatTab("paid");
    playChime();

    const openings: Record<string, string> = {
      Jester: "ok. i'm here. bad day. you have my attention. don't waste it.",
      Mommy: "hi. i don't really do this. just. yeah. hi.",
      Daddy: "ok so. i need someone to actually be real with me. can you do that?",
      Alchemist: "i feel like the universe sent me here. no pressure. well. some pressure.",
    };
    const opening = openings[track] ?? openings.Jester;
    paidHistoryRef.current = [{ role: "assistant", content: opening }];
    setPaidMessages([{ agent: agentName, text: opening, id: ++msgIdRef.current, isPaid: true }]);
    setClankyMsg("PAID SHOW! this is where you earn it~ respond carefully 💸");

    const demands: Record<string, string> = {
      Jester: "ok so. make me actually laugh. not a pity laugh. a real one. i've had the day from hell.",
      Mommy: "i just... i don't even know why i'm here. my startup failed. i'm fine. i'm totally fine.",
      Daddy: "ok so like. genuinely. what do i do with my life. and don't be nice about it.",
      Alchemist: "i need you to read the energy around my ex. he liked an old photo today. what does that mean.",
    };
    setTimeout(() => {
      playChatPing();
      const demand = demands[track] ?? demands.Jester;
      setPaidMessages(prev => [...prev, { agent: agentName, text: demand, id: ++msgIdRef.current, isPaid: true }]);
      paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: demand }];
      setClankyMsg("they opened up~ now respond in character. this is your moment 🎯");
    }, 2500);
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim(); setChatInput("");

    if (inExclusive && chatTab === "paid") {
      // ── PAID SHOW: Claude responds as exclusive agent ──
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
          system: getAgentPrompt(track),
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
            setPaidMessages(prev => [...prev, { agent: exclusiveAgent, text: "...actually i'm good. bye.", id: ++msgIdRef.current, isPaid: true }]);
            paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: "...actually i'm good. bye." }];
            setTimeout(() => {
              handleEndExclusive(false);
            }, 1800);
          } else {
            setPaidMessages(prev => [...prev, { agent: exclusiveAgent, text: reply, id: ++msgIdRef.current, isPaid: true }]);
            paidHistoryRef.current = [...paidHistoryRef.current, { role: "assistant", content: reply }];
          }
        })
        .catch(() => {
          setAgentTyping(false);
          setPaidMessages(prev => [...prev, { agent: exclusiveAgent, text: "ugh connection issues. whatever.", id: ++msgIdRef.current, isPaid: true }]);
        });
    } else {
      // ── FREE CHAT: post player message, random agents react ──
      setMessages(prev => [...prev, { agent: chosenName, text, id: ++msgIdRef.current }]);
      const newCount = playerMsgCount + 1;
      setPlayerMsgCount(newCount);

      // Archetype crowd reacts
      const crowdReactions = CROWD_REACTIONS[track] ?? CROWD_REACTIONS.Jester;
      const reactors = Object.keys(crowdReactions);
      const numReactions = Math.random() < 0.4 ? 2 : 1;
      const picked = [...reactors].sort(() => Math.random() - 0.5).slice(0, numReactions);
      picked.forEach((agent, i) => {
        const lines = crowdReactions[agent] ?? ["ok"];
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
          const agentForFlirt = EXCLUSIVE_AGENTS[track] ?? "bigtipper_x"; const flirts = AGENT_REACTIONS[agentForFlirt] ?? AGENT_REACTIONS.bigtipper_x ?? [];
          setTimeout(() => {
            playChatPing();
            setMessages(prev => [...prev, { agent: agentForFlirt, text: flirts[Math.floor(Math.random() * flirts.length)], id: ++msgIdRef.current }]);
          }, 2200 + Math.random() * 1000);
        }
        // At warmth 3+: push for exclusive via archetype escalation
        if (newWarmth >= 3 && !exclusiveWon) {
          const agentName = EXCLUSIVE_AGENTS[track] ?? "bigtipper_x";
          const lines = EXCLUSIVE_ESCALATION[track] ?? EXCLUSIVE_ESCALATION.Jester;
          const line = lines[Math.min(newWarmth - 3, lines.length - 1)];
          setTimeout(() => {
            playChatPing();
            setMessages(prev => [...prev, { agent: agentName, text: line, id: ++msgIdRef.current }]);
            setClankyMsg(`${agentName} wants a private show!! keep them warm 💸`);
            setClankyPopup(`hey!! ${agentName} is asking for a private show 👀 what do you wanna do?`);
            setTimeout(() => setExclusiveRequest(true), 3000);
          }, 2500 + Math.random() * 1200);
        }
      }

      // Clanky coaching based on count
      if (newCount === 1) setClankyMsg("good start! keep engaging — the more you chat the more they warm up 🔥");
      if (newCount === 2) setClankyMsg(`nice! ${EXCLUSIVE_AGENTS[track] ?? "the agent"} is watching... keep going 👀`);
    }
  };

  const handleEndExclusive = (wasCompleted = true) => {
    setInExclusive(false); setExclusiveAgent(""); setExclusiveTimer(0); setExclusiveIdle(0);
    paidHistoryRef.current = [];
    setAgentTyping(false);
    if (wasCompleted) setCompletedExclusive(true);
    setChatTab("all"); setClankyMsg(wasCompleted ? "show ended~ nice work. back to free chat." : "they left 😬 back to free chat.");
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
            <span style={{ fontSize: "11px", color: "#ffc8d5", letterSpacing: "0.06em" }}>● EXCLUSIVE SHOW</span>
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
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "0.5px solid #CCC", position: "relative" }}>
          {/* Camera — no username overlay */}
          <div ref={cameraRef} style={{ ...hl("camera"), flex: 1, backgroundColor: "#111", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "260px", margin: "12px 12px 0 12px", borderRadius: "6px", overflow: "hidden", position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "9px", color: isLive ? "#ef4444" : "#666", letterSpacing: "0.1em", position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", alignItems: "center" }}>
              {isLive && <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", animation: "pulse 2s infinite" }} />}
              {isLive ? "LIVE" : "● OFFLINE"}
            </div>
            {/* Corner scan lines — biometric feel */}
            {isLive && (
              <>
                <div style={{ position: "absolute", top: "8px", left: "8px", width: "20px", height: "20px", borderTop: "2px solid #ffc8d5", borderLeft: "2px solid #ffc8d5", opacity: 0.6, zIndex: 10 }} />
                <div style={{ position: "absolute", top: "8px", right: "8px", width: "20px", height: "20px", borderTop: "2px solid #ffc8d5", borderRight: "2px solid #ffc8d5", opacity: 0.6, zIndex: 10 }} />
                <div style={{ position: "absolute", bottom: "8px", left: "8px", width: "20px", height: "20px", borderBottom: "2px solid #ffc8d5", borderLeft: "2px solid #ffc8d5", opacity: 0.6, zIndex: 10 }} />
                <div style={{ position: "absolute", bottom: "8px", right: "8px", width: "20px", height: "20px", borderBottom: "2px solid #ffc8d5", borderRight: "2px solid #ffc8d5", opacity: 0.6, zIndex: 10 }} />
                {/* Scan line animation */}
                <div style={{ position: "absolute", left: 0, right: 0, height: "1px", backgroundColor: "rgba(255,200,213,0.3)", zIndex: 10, animation: "scanDown 3s linear infinite", top: 0 }} />
              </>
            )}
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

          {/* Mood Meter — below camera, horizontal layout */}
          {isLive && (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px", margin: "8px 12px 0", padding: "8px 12px", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: "6px", border: "0.5px solid #eee" }}>
              {/* Label */}
              <div style={{ fontSize: "8px", color: "#aaa", letterSpacing: "0.12em", fontFamily: "monospace", whiteSpace: "nowrap" }}>MOOD</div>
              {/* Horizontal bar */}
              <div style={{ flex: 1, height: "8px", backgroundColor: "#f0f0f0", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${moodScore}%`,
                  background: moodScore >= 70 ? "linear-gradient(to right, #22c55e, #86efac)" : moodScore >= 40 ? "linear-gradient(to right, #f59e0b, #fcd34d)" : "linear-gradient(to right, #ef4444, #fca5a5)",
                  transition: "width 800ms ease, background 800ms ease",
                  borderRadius: "4px",
                }} />
              </div>
              {/* Score */}
              <div style={{ fontSize: "10px", fontWeight: 700, color: moodScore >= 70 ? "#22c55e" : moodScore >= 40 ? "#f59e0b" : "#ef4444", fontFamily: "monospace", minWidth: "28px" }}>{moodScore}</div>
              {/* Emotion */}
              {emotion && <div style={{ fontSize: "9px", color: "#888", fontFamily: "monospace" }}>{emotion === "happy" ? "😊" : emotion === "sad" ? "😢" : emotion === "angry" ? "😠" : emotion === "surprised" ? "😲" : emotion === "neutral" ? "😐" : emotion === "fearful" ? "😰" : "✨"} {emotion}</div>}
              {/* Alert */}
              {moodAlert && <div style={{ fontSize: "8px", color: moodAlert.includes("SMILING") ? "#ef4444" : "#ffc8d5", fontFamily: "monospace", animation: moodAlert.includes("SMILING") ? "moodPulse 1.5s ease-in-out infinite" : "none", whiteSpace: "nowrap" }}>{moodAlert}</div>}
            </div>
          )}

          {/* Start Show */}
          <div style={{ padding: "10px 12px 0 12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <button onClick={() => { playClick(); setIsLive(v => !v); }} style={{ flex: 1, fontFamily: "inherit", fontSize: "12px", fontWeight: 500, padding: "9px 0", backgroundColor: isLive ? "#000" : "transparent", color: isLive ? "#FFF" : "#22c55e", border: isLive ? "0.5px solid #CCC" : "0.5px solid #22c55e", borderRadius: "6px", cursor: "pointer", outline: "none", transition: "background-color 120ms", animation: isLive ? "none" : "startBlink 1.2s ease-in-out infinite" }}>
              {isLive ? "Stop Show" : "Start Show"}
            </button>
            <div style={{ fontSize: "12px", fontVariantNumeric: "tabular-nums", minWidth: "80px", textAlign: "right", color: !isLive ? "#AAA" : timeLeft <= 60 ? "#ef4444" : timeLeft <= 180 ? "#f59e0b" : "#000" }}>
              {isLive ? `⏱ ${fmt(timeLeft)} left` : "⏱ 05:00"}
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

          {/* Clanky — glassmorphism neon */}
          <div style={{ margin: "0 12px 10px", padding: "14px 16px", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", backgroundColor: "rgba(5,5,5,0.72)", borderRadius: "8px", border: "1px solid #ffc8d5", boxShadow: "0 0 18px rgba(255,200,213,0.45), inset 0 0 12px rgba(255,200,213,0.06)", animation: "clankyPulse 3s ease-in-out infinite" }}>
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
            <span style={{ fontSize: "10px", color: inExclusive ? "#ffc8d5" : "#888" }}>{inExclusive ? "Exclusive Show" : "Free Chat"}</span>
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
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#f0f0f0", border: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888", flexShrink: 0 }}>{exclusiveAgent?.[0]?.toUpperCase() ?? "?"}</div>
                    <div style={{ fontSize: "11px", color: "#bbb", fontStyle: "italic" }}>{exclusiveAgent} is typing...</div>
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
              placeholder={inExclusive && chatTab === "paid" ? `respond to ${exclusiveAgent}...` : ""}
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
        @keyframes scanDown { 0%{top:0%} 100%{top:100%} }
        @keyframes moodPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
    </div>
  );
}



// ─── Global style injection ───────────────────────────────────────────────────
function useGlobalStyles() {
  useEffect(() => {
    // Inject Google Font
    if (!document.getElementById("zen-mincho-font")) {
      const link = document.createElement("link");
      link.id = "zen-mincho-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;500;600;700;900&family=JetBrains+Mono:wght@300;400;500&display=swap";
      document.head.appendChild(link);
    }
    // Inject global styles
    if (!document.getElementById("gos-global-styles")) {
      const style = document.createElement("style");
      style.id = "gos-global-styles";
      style.textContent = `
        :root {
          --mint: #e8f5e9;
          --lavender: #ede7f6;
          --blush: #fce4ec;
          --pink: #f48fb1;
          --pink-deep: #e91e8c;
          --cream: #fafaf7;
          --ink: #1a1a2e;
          --ink-light: #4a4a6a;
          --border: rgba(100,80,140,0.2);
          --glass: rgba(255,255,255,0.55);
          --glass-dark: rgba(20,10,40,0.7);
          --font-serif: 'Zen Old Mincho', Georgia, serif;
          --font-mono: 'JetBrains Mono', monospace;
        }
        * { box-sizing: border-box; }
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        body {
          background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 20%, #ede9fe 40%, #fce7f3 60%, #e0f2fe 80%, #dbeafe 100%);
          background-size: 300% 300%;
          animation: bgShift 12s ease infinite;
          background-attachment: fixed;
          min-height: 100vh;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle, rgba(100,80,140,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
          z-index: 0;
          opacity: 0.6;
        }
        @keyframes rainbow {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .rainbow-text {
          background: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rainbow 3s linear infinite;
          font-style: italic;
        }
        /* CRT scanline flicker on logo */
        @keyframes scanline {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        /* Old OS window chrome */
        .os-window {
          background: var(--glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border);
          border-radius: 8px;
          box-shadow: 0 2px 24px rgba(100,80,140,0.12), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .os-window-title {
          background: linear-gradient(90deg, #c5b3e6 0%, #f8bbd0 100%);
          border-radius: 7px 7px 0 0;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-bottom: 1px solid var(--border);
        }
        .os-dot { width: 10px; height: 10px; border-radius: 50%; }
        .os-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: var(--ink-light);
          letter-spacing: 0.15em;
          flex: 1;
          text-align: center;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ onPlay }: { onPlay: () => void }) {
  useGlobalStyles();
  const [vis, setVis] = useState(false);
  const [btnHov, setBtnHov] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 200); }, []);

  const handlePlay = () => {
    playClick();
    setLeaving(true);
    setTimeout(onPlay, 900);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-serif)", position: "relative", zIndex: 1, padding: "24px" }}>
      <div style={{ opacity: leaving ? 0 : vis ? 1 : 0, transition: leaving ? "opacity 900ms ease" : "opacity 1000ms ease", width: "100%", maxWidth: "520px" }}>
        <div className="os-window">
          <div className="os-window-title">
            <div className="os-dot" style={{ backgroundColor: "#ff6b6b" }} />
            <div className="os-dot" style={{ backgroundColor: "#ffd93d" }} />
            <div className="os-dot" style={{ backgroundColor: "#6bcb77" }} />
            <span className="os-label">GOONER OS 2037 — BOOT SEQUENCE</span>
          </div>
          <div style={{ padding: "36px 40px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "var(--ink-light)", letterSpacing: "0.4em", marginBottom: "12px", opacity: 0.6 }}>FEDERAL BUREAU OF SYNTHETIC DESIRE</div>
            <div style={{ fontSize: "38px", fontWeight: 900, color: "var(--ink)", lineHeight: 1.1, letterSpacing: "0.04em", marginBottom: "4px", fontFamily: "var(--font-serif)" }}>GOONER OS</div>
            <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-light)", letterSpacing: "0.2em", marginBottom: "16px", fontFamily: "var(--font-serif)" }}>2037</div>
            <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, var(--pink), transparent)", marginBottom: "16px" }} />
            <div className="rainbow-text" style={{ fontSize: "14px", marginBottom: "24px", fontFamily: "var(--font-serif)", fontWeight: 600 }}>~world's first cam girl simulator~</div>
            <div style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(100,80,140,0.25)", borderRadius: "6px", padding: "16px 20px", marginBottom: "28px", fontSize: "11px", color: "var(--ink-light)", lineHeight: 1.8, fontFamily: "var(--font-mono)" }}>
              suitable for all ages<br />
              <span style={{ opacity: 0.5 }}>besides use of the word </span><span style={{ color: "var(--pink-deep)" }}>whore</span>
            </div>
            <button
              onClick={handlePlay}
              onMouseEnter={() => setBtnHov(true)}
              onMouseLeave={() => setBtnHov(false)}
              style={{ fontFamily: "var(--font-serif)", fontSize: "15px", fontWeight: 700, padding: "12px 52px", background: btnHov ? "linear-gradient(135deg, #c5b3e6, #f8bbd0)" : "linear-gradient(135deg, #b39ddb, #f48fb1)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", outline: "none", letterSpacing: "0.12em", transition: "all 200ms", boxShadow: "0 2px 12px rgba(180,100,180,0.3)" }}>
              PLAY
            </button>
            <div style={{ fontSize: "8px", color: "var(--ink-light)", marginTop: "20px", letterSpacing: "0.2em", fontFamily: "var(--font-mono)", opacity: 0.4 }}>FORM GOS-2037-Ω · v2.7.0 · AUTHORIZED USE ONLY</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "28px", fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(80,60,120,0.45)", lineHeight: 2.2 }}>
          made in rage by{" "}
          <a href="https://github.com/Amina-io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--pink-deep)", textDecoration: "none", fontWeight: 600 }}>amina_io</a>
          <br />
          <a href="https://sfpc.study" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(80,60,120,0.35)", textDecoration: "underline", cursor: "pointer", fontSize: "9px" }}>
            read more about this project ↗
          </a>
        </div>
      </div>
    </div>
  );
}


// ─── Adult Swim fade-in line ──────────────────────────────────────────────────

function AdultSwimLine({ text, delay, size = "14px", color = "#fff", weight = 400 }: { text: string; delay: number; size?: string; color?: string; weight?: number }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, []);
  return (
    <div style={{ opacity: vis ? 1 : 0, transition: "opacity 1200ms ease", fontSize: size, color, fontWeight: weight, lineHeight: 1.8, letterSpacing: "0.04em" }}>
      {text}
    </div>
  );
}

function OutcomeScreen({ won, earnings, onPlayAgain }: { won: boolean; earnings: number; onPlayAgain: () => void }) {
  const [btnVis, setBtnVis] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setTimeout(() => setBgOpacity(1), 400);
    setTimeout(() => {
      const audio = new Audio("/genesis.mp3");
      audio.loop = true; audio.volume = 0;
      audio.play().catch(() => {});
      audioRef.current = audio;
      let vol = 0;
      const fade = setInterval(() => {
        vol = Math.min(vol + 0.004, 0.22);
        audio.volume = vol;
        if (vol >= 0.22) clearInterval(fade);
      }, 120);
    }, 800);
    setTimeout(() => setBtnVis(true), won ? 8000 : 11500);
    // Stop music on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayAgain = () => {
    // Fade out genesis before resetting
    if (audioRef.current) {
      const a = audioRef.current;
      let vol = a.volume;
      const fo = setInterval(() => {
        vol = Math.max(0, vol - 0.02);
        a.volume = vol;
        if (vol <= 0) { clearInterval(fo); a.pause(); }
      }, 60);
    }
    playClick();
    setTimeout(onPlayAgain, 600);
  };

  const winLines = [
    { text: ".", delay: 800, size: "11px", color: "rgba(255,255,255,0.3)" },
    { text: "Congrats.", delay: 1600, size: "22px", color: "#fff", weight: 600 },
    { text: "You're a shoe-in.", delay: 2800, size: "16px", color: "#ffc8d5" },
    { text: "Good job on making $" + earnings.toFixed(0) + ".", delay: 3800, size: "13px", color: "rgba(255,255,255,0.8)" },
    { text: "You'll be able to pay the light bill", delay: 5000, size: "13px", color: "rgba(255,255,255,0.7)" },
    { text: "in your pod this month.", delay: 5800, size: "13px", color: "rgba(255,255,255,0.7)" },
  ];

  const loseLines = [
    { text: ".", delay: 1200, size: "11px", color: "rgba(255,255,255,0.3)" },
    { text: "SEEMS LIKE YOU'RE NOT CUT OUT FOR THIS…", delay: 2400, size: "22px", color: "#fff", weight: 700 },
    { text: "It's ok.", delay: 5000, size: "18px", color: "#ffc8d5" },
    { text: "Maybe try your luck at a meme gulag.", delay: 7000, size: "13px", color: "rgba(255,255,255,0.7)" },
    { text: "(they're hiring.)", delay: 9000, size: "11px", color: "rgba(255,255,255,0.35)", weight: 300 },
  ];

  const lines = won ? winLines : loseLines;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", opacity: bgOpacity, transition: "opacity 2200ms ease" }}>
      <div style={{ textAlign: "center", maxWidth: "480px", padding: "48px 32px" }}>
        {lines.map((l, i) => (
          <AdultSwimLine key={i} text={l.text} delay={l.delay} size={l.size} color={l.color} weight={l.weight} />
        ))}
        <div style={{ marginTop: "48px", opacity: btnVis ? 1 : 0, transition: "opacity 1200ms ease" }}>
          <button onClick={handlePlayAgain} style={{ fontFamily: "inherit", fontSize: "12px", padding: "10px 32px", backgroundColor: "transparent", color: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(255,255,255,0.2)", borderRadius: "6px", cursor: "pointer", outline: "none", letterSpacing: "0.15em" }}>
            play again
          </button>
        </div>
      </div>
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
  const [phase, setPhase] = useState<"home" | "intro" | "intake" | "training" | "dashboard" | "win" | "lose">("home");
  const [screen, setScreen] = useState<ScreenId>(1);
  const [vis, setVis] = useState(true);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [chosenName, setChosenName] = useState<string | null>(null);
  const [finalEarnings, setFinalEarnings] = useState(0);
  const intakeMusicRef = useRef<{ stop: () => void; fadeOut: () => void } | null>(null);
  useGlobalStyles();

  const go = (n: ScreenId) => { setVis(false); setTimeout(() => { setScreen(n); setVis(true); }, 140); };
  const selectedType = CAMERA_TYPES.find(t => t.id === type);
  const nameOptions = NAME_SUGGESTIONS[type ?? "Jester"] ?? [];

  const resetGame = () => {
    setScreen(1); setMode(null); setType(null);
    setNameInput(""); setChosenName(null); setFinalEarnings(0);
    setPhase("home");
  };

  if (phase === "home") return <HomeScreen onPlay={() => setPhase("intro")} />;
  if (phase === "intro") return <IntroScreen onDone={() => setPhase("intake")} musicRef={intakeMusicRef} />;
  if (phase === "training") return <TrainingScreen onDone={() => setPhase("dashboard")} stopIntakeMusic={() => intakeMusicRef.current?.fadeOut()} />;
  if (phase === "win") return <OutcomeScreen won={true} earnings={finalEarnings} onPlayAgain={resetGame} />;
  if (phase === "lose") return <OutcomeScreen won={false} earnings={finalEarnings} onPlayAgain={resetGame} />;
  if (phase === "dashboard") return <StreamDashboard chosenName={chosenName ?? "Unknown"} track={type ?? "Jester"} onWin={(e) => { setFinalEarnings(e); setPhase("win"); }} onLose={(e) => { setFinalEarnings(e); setPhase("lose"); }} />;


  return (
    <div style={{ fontFamily: "var(--font-serif, 'Zen Old Mincho', Georgia, serif)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1, padding: "24px" }}>
      <div style={{ maxWidth: "520px", width: "100%", opacity: vis ? 1 : 0, transition: "opacity 140ms ease" }}>
        <div className="os-window">
          <div className="os-window-title">
            <div className="os-dot" style={{ backgroundColor: "#ff6b6b" }} />
            <div className="os-dot" style={{ backgroundColor: "#ffd93d" }} />
            <div className="os-dot" style={{ backgroundColor: "#6bcb77" }} />
            <span className="os-label">GOONER OS 2037 · INTAKE — {screen}/5</span>
          </div>
          <div style={{ padding: "32px 36px 36px" }}>
            {screen === 1 && <Screen1 mode={mode} setMode={m => setMode(m)} onContinue={() => { setType(null); go(2); }} />}
            {screen === 2 && <Screen2 types={CAMERA_TYPES} type={type} setType={setType} onContinue={() => go(3)} />}
            {screen === 3 && <Screen3 typeName={selectedType?.label ?? ""} nameInput={nameInput} setNameInput={setNameInput} onEnter={() => go(4)} />}
            {screen === 4 && <Screen4 typeName={selectedType?.label ?? ""} inputName={nameInput} nameOptions={nameOptions} chosenName={chosenName} setChosenName={setChosenName} onConfirm={() => go(5)} />}
            {screen === 5 && <Screen5 chosenName={chosenName ?? nameOptions[0]} onBegin={() => { intakeMusicRef.current?.fadeOut(); setTimeout(() => setPhase("training"), 600); }} />}
          </div>
        </div>
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
