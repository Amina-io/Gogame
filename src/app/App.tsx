import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ModeId = "camera" | "text";
type ScreenId = 1 | 2 | 3 | 4 | 5 | 6;

interface TypeCard {
  id: string;
  label: string;
  desc: string;
}

interface ChatMessage {
  agent: string;
  text: string;
  id: number;
}

// ─── Tour Data ────────────────────────────────────────────────────────────────

const TOUR_STOPS = [
  {
    zone: "camera",
    text: "This is where they see you. Or don't. Either way, make it count. Note: your camera and image data is never saved after this session.",
  },
  {
    zone: "rates",
    text: "You set the price — anywhere from $5 to $5,000 per minute. Adjust whenever you want. Lower rates bring more traffic. Higher rates bring higher stakes. Read the room.",
  },
  {
    zone: "chat",
    text: "Agents will trickle in here. Some will vibe with your energy, some won't. Engage wisely — your goal is to get them into an exclusive chat, or shake loose a tip along the way.",
  },
  {
    zone: "exclusive",
    text: "This is where the real time is spent. Get them in, keep them wanting more. The longer they stay, the better your efficiency ratio.",
  },
  {
    zone: "earnings",
    text: "Your total earnings, tips included. One of three things being tracked — along with your efficiency ratio and total session time.",
  },
  {
    zone: "tips",
    text: "Sometimes they just throw money at you mid-conversation. Be charming. Be unpredictable. See what happens.",
  },
];

// ─── Fake Chat Data ───────────────────────────────────────────────────────────

const CHAT_SCRIPT: { delay: number; agent: string; text: string }[] = [
  { delay: 900, agent: "xX_degen99_Xx", text: "hi" },
  { delay: 1800, agent: "lurker_anon", text: "hello..." },
  { delay: 3100, agent: "xX_degen99_Xx", text: "what are ur rates" },
  { delay: 4600, agent: "bigtipper_x", text: "heyyy" },
  { delay: 5800, agent: "lurker_anon", text: "🔥" },
  { delay: 7200, agent: "bigtipper_x", text: "can we go private?" },
  { delay: 9000, agent: "payup_r", text: "accepting tips?" },
  { delay: 11000, agent: "xX_degen99_Xx", text: "omg" },
  { delay: 13500, agent: "bigtipper_x", text: "private rate??" },
  { delay: 15000, agent: "lurker_anon", text: "rate?" },
];

// ─── Existing Intake Data ─────────────────────────────────────────────────────

const CAMERA_TYPES: TypeCard[] = [
  { id: "Jester", label: "Jester", desc: "Chaos as charm. You make them laugh first." },
  { id: "Mommy", label: "Mommy", desc: "Softness with authority. You hold the room." },
  { id: "Daddy", label: "Daddy", desc: "Steady. Commanding. They come to you." },
  { id: "Alchemist", label: "Alchemist", desc: "Transformation on demand. Pure theatre." },
];

const TEXT_TYPES: TypeCard[] = [
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

// ─── Audio ────────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (_) {}
}

// ─── Hook: Typing Effect ──────────────────────────────────────────────────────

function useTypingEffect(text: string, speed = 16) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(iv);
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text]);
  return displayed;
}

// ─── Shared Intake Primitives ─────────────────────────────────────────────────

function StepLabel({ step }: { step: string }) {
  return (
    <div style={{ fontSize: "11px", color: "#888888", marginBottom: "20px" }}>
      {">"} {step}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "17px", fontWeight: 500, color: "#000000", marginBottom: "24px", lineHeight: 1.55 }}>
      {children}
    </div>
  );
}

function ActionButton({
  enabled, onClick, label = "continue ↗", accent = false,
}: {
  enabled: boolean; onClick: () => void; label?: string; accent?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const border = !enabled ? "0.5px solid #CCCCCC" : accent ? "0.5px solid #F4B8C8" : "0.5px solid #000000";
  return (
    <button
      disabled={!enabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "inherit", fontSize: "13px", fontWeight: 400,
        backgroundColor: hov && enabled ? "#FAFAFA" : "transparent",
        border, borderRadius: "6px", padding: "8px 18px",
        color: enabled ? "#000000" : "#BBBBBB",
        cursor: enabled ? "pointer" : "default",
        transition: "background-color 80ms ease", outline: "none", letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  );
}

function OptionCard({
  id, label, desc, selected, onClick,
}: {
  id: string; label: string; desc?: string; selected: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "12px 16px",
        border: `0.5px solid ${selected ? "#000000" : "#CCCCCC"}`,
        borderRadius: "6px",
        backgroundColor: selected || hov ? "#F5F5F5" : "transparent",
        cursor: "pointer",
        transition: "background-color 80ms ease, border-color 80ms ease",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 500, color: "#000000", lineHeight: 1.4 }}>{label}</div>
      {desc && <div style={{ fontSize: "11px", color: "#888888", marginTop: "4px", lineHeight: 1.45 }}>{desc}</div>}
    </div>
  );
}

// ─── Intake Screens ───────────────────────────────────────────────────────────

function Screen1({ mode, setMode, onContinue }: { mode: ModeId | null; setMode: (m: ModeId) => void; onContinue: () => void }) {
  return (
    <>
      <StepLabel step="intake_01" />
      <Heading>Will you be a camera or<br />text-only whore?</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        <OptionCard id="camera" label="Camera" desc="Visual presence. You will be seen." selected={mode === "camera"} onClick={() => setMode("camera")} />
        <OptionCard id="text" label="Text-only" desc="Language as the medium. No image required." selected={mode === "text"} onClick={() => setMode("text")} />
      </div>
      <div style={{ fontSize: "11px", color: "#AAAAAA", fontStyle: "italic", marginBottom: "32px" }}>You can change this later.</div>
      <ActionButton enabled={mode !== null} onClick={onContinue} />
    </>
  );
}

function Screen2({ types, type, setType, onContinue }: { types: TypeCard[]; type: string | null; setType: (t: string) => void; onContinue: () => void }) {
  return (
    <>
      <StepLabel step="intake_02" />
      <Heading>Now — what kind of whore<br />will you be?</Heading>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "32px" }}>
        {types.map((t) => (
          <OptionCard key={t.id} id={t.id} label={t.label} desc={t.desc} selected={type === t.id} onClick={() => setType(t.id)} />
        ))}
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
      <div style={{ fontSize: "13px", color: "#888888", marginBottom: "32px" }}>{"You'll need a new name."}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
        <span style={{ fontSize: "15px", color: "#888888", userSelect: "none" }}>{">"}</span>
        <div style={{ position: "relative", width: "240px" }}>
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #000000", height: "30px", paddingBottom: "2px", pointerEvents: "none" }}>
            <span style={{ fontSize: "15px", color: "#000000", letterSpacing: "0.01em", whiteSpace: "pre", minWidth: 0 }}>{nameInput}</span>
            <span style={{ display: "inline-block", width: "8px", height: "14px", backgroundColor: "#000000", animation: "blink 1s step-end infinite", flexShrink: 0 }} />
          </div>
          <input
            ref={inputRef} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) onEnter(); }}
            style={{ position: "absolute", inset: 0, background: "transparent", border: "none", outline: "none", color: "transparent", caretColor: "transparent", fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", width: "100%", cursor: "text", zIndex: 1 }}
          />
        </div>
      </div>
      <ActionButton enabled={nameInput.trim().length > 0} onClick={onEnter} label={"enter ↗"} />
    </>
  );
}

function Screen4({ typeName, inputName, nameOptions, chosenName, setChosenName, onConfirm }: { typeName: string; inputName: string; nameOptions: string[]; chosenName: string | null; setChosenName: (n: string) => void; onConfirm: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShown(true), 60); return () => clearTimeout(t); }, []);
  return (
    <>
      <StepLabel step="intake_04" />
      <div style={{ fontSize: "17px", fontWeight: 500, color: "#000000", marginBottom: "24px", lineHeight: 1.55, opacity: shown ? 1 : 0, transform: shown ? "translateY(0)" : "translateY(4px)", transition: "opacity 400ms ease, transform 400ms ease" }}>
        Hm.... {typeName} &ldquo;{inputName}&rdquo;...<br />{"that's no good!"}
      </div>
      <div style={{ borderBottom: "0.5px solid #EEEEEE", marginBottom: "16px" }} />
      <div style={{ fontSize: "12px", color: "#888888", marginBottom: "16px" }}>the OS has a few options for you:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "32px" }}>
        {nameOptions.map((n) => <OptionCard key={n} id={n} label={n} selected={chosenName === n} onClick={() => setChosenName(n)} />)}
      </div>
      <ActionButton enabled={chosenName !== null} onClick={onConfirm} label={"confirm ↗"} />
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
      <div style={{ fontSize: "17px", fontWeight: 500, color: "#000000", marginBottom: "12px", lineHeight: 1.55, opacity: stage >= 1 ? 1 : 0, transition: "opacity 400ms ease" }}>
        {chosenName} eh?
      </div>
      <div style={{ fontSize: "13px", color: "#888888", marginBottom: "48px", lineHeight: 1.6, opacity: stage >= 2 ? 1 : 0, transition: "opacity 400ms ease" }}>
        The name you chose for yourself reveals a lot...
      </div>
      <div style={{ opacity: stage >= 3 ? 1 : 0, transition: "opacity 400ms ease" }}>
        <ActionButton enabled={stage >= 3} onClick={onBegin} label={"begin tour ↗"} accent />
      </div>
    </>
  );
}

// ─── Tour Tooltip ─────────────────────────────────────────────────────────────

function TourTooltip({
  stopIndex, totalStops, text, targetRef, isModal, onPrev, onNext,
}: {
  stopIndex: number;
  totalStops: number;
  text: string;
  targetRef: React.RefObject<HTMLElement | null>;
  isModal: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [pos, setPos] = useState({ top: 200, left: 200 });
  const typed = useTypingEffect(text, 14);

  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tooltipW = 300;

      if (isModal) {
        setPos({ top: Math.min(vh * 0.65, vh - 180), left: vw / 2 - tooltipW / 2 });
        return;
      }

      const el = targetRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      let top = Math.max(80, Math.min(rect.top, vh - 220));
      let left: number;

      if (rect.right + tooltipW + 24 <= vw) {
        left = rect.right + 16;
      } else if (rect.left - tooltipW - 24 >= 0) {
        left = rect.left - tooltipW - 16;
      } else {
        left = vw / 2 - tooltipW / 2;
        top = Math.min(rect.bottom + 16, vh - 220);
      }

      setPos({ top, left });
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [stopIndex, targetRef, isModal]);

  return (
    <div
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: 300,
        zIndex: 300,
        backgroundColor: "#0A0A0A",
        color: "#FFFFFF",
        padding: "20px",
        borderRadius: "6px",
        fontFamily: "'JetBrains Mono', monospace",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontSize: "9px", color: "#555555", letterSpacing: "0.1em", marginBottom: "12px" }}>
        {String(stopIndex + 1).padStart(2, "0")} / {String(totalStops).padStart(2, "0")}
      </div>

      <p style={{ fontSize: "11px", lineHeight: 1.7, color: "#DDDDDD", marginBottom: "20px", minHeight: "80px" }}>
        {typed}
        <span style={{ display: "inline-block", width: "1px", height: "11px", backgroundColor: "#F4B8C8", marginLeft: "2px", verticalAlign: "middle", animation: "blink 1s step-end infinite" }} />
      </p>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {stopIndex > 0 && (
          <button
            onClick={onPrev}
            style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #333333", borderRadius: "4px", color: "#888888", padding: "6px 12px", cursor: "pointer", outline: "none" }}
          >
            ← prev
          </button>
        )}
        <button
          onClick={onNext}
          style={{ fontFamily: "inherit", fontSize: "11px", background: "transparent", border: "0.5px solid #F4B8C8", borderRadius: "4px", color: "#F4B8C8", padding: "6px 12px", cursor: "pointer", outline: "none", marginLeft: stopIndex === 0 ? "auto" : undefined }}
        >
          {stopIndex < totalStops - 1 ? "next →" : "end tour"}
        </button>
      </div>
    </div>
  );
}

// ─── Exclusive Chat Modal ─────────────────────────────────────────────────────

function ExclusiveChatModal({
  modalRef, onAccept, onDecline,
}: {
  modalRef: React.RefObject<HTMLDivElement | null>;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [hA, setHA] = useState(false);
  const [hD, setHD] = useState(false);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.7)" }}>
      <div
        ref={modalRef}
        style={{
          backgroundColor: "#FFFFFF",
          border: "0.5px solid #CCCCCC",
          borderRadius: "6px",
          padding: "40px 48px",
          maxWidth: "420px",
          width: "90%",
          textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: "11px", color: "#888888", marginBottom: "16px", letterSpacing: "0.05em" }}>
          exclusive show request
        </div>
        <div style={{ fontSize: "17px", fontWeight: 500, color: "#000000", marginBottom: "8px", lineHeight: 1.5 }}>
          bigtipper_x has requested<br />an exclusive show!
        </div>
        <div style={{ fontSize: "13px", color: "#888888", marginBottom: "36px" }}>Join?</div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={onAccept}
            onMouseEnter={() => setHA(true)}
            onMouseLeave={() => setHA(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 500, padding: "10px 28px", backgroundColor: hA ? "#111" : "#000000", color: "#FFFFFF", border: "none", borderRadius: "6px", cursor: "pointer", outline: "none", transition: "background-color 80ms" }}
          >
            Accept
          </button>
          <button
            onClick={onDecline}
            onMouseEnter={() => setHD(true)}
            onMouseLeave={() => setHD(false)}
            style={{ fontFamily: "inherit", fontSize: "13px", fontWeight: 400, padding: "10px 28px", backgroundColor: hD ? "#F5F5F5" : "transparent", color: "#000000", border: "0.5px solid #CCCCCC", borderRadius: "6px", cursor: "pointer", outline: "none", transition: "background-color 80ms" }}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stream Dashboard ─────────────────────────────────────────────────────────

function StreamDashboard({ chosenName }: { chosenName: string }) {
  // Tour state
  const [tourStop, setTourStop] = useState(0);
  const [tourActive, setTourActive] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Dashboard state
  const [isLive, setIsLive] = useState(false);
  const [timer, setTimer] = useState(0);
  const [rate, setRate] = useState(20);
  const [chatTab, setChatTab] = useState<"all" | "paid" | "guest">("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [earnings, setEarnings] = useState(0);
  const [tips, setTips] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  // Zone refs
  const cameraRef = useRef<HTMLDivElement>(null);
  const ratesRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const earningsRef = useRef<HTMLDivElement>(null);
  const tipsRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const zoneRefMap: Record<string, React.RefObject<HTMLElement | null>> = {
    camera: cameraRef,
    rates: ratesRef,
    chat: chatRef,
    exclusive: modalRef,
    earnings: earningsRef,
    tips: tipsRef,
  };

  const currentZone = TOUR_STOPS[tourStop].zone;
  const activeRef = zoneRefMap[currentZone];
  const isModalStop = currentZone === "exclusive";

  // Handle tour navigation
  const goPrev = () => {
    if (tourStop === 0) return;
    const prev = tourStop - 1;
    setShowModal(false);
    setTourStop(prev);
    if (TOUR_STOPS[prev].zone === "exclusive") {
      setShowModal(true);
    }
  };

  const goNext = () => {
    if (tourStop >= TOUR_STOPS.length - 1) {
      setTourActive(false);
      setShowModal(false);
      return;
    }
    const next = tourStop + 1;
    setShowModal(false);
    setTourStop(next);
    if (TOUR_STOPS[next].zone === "exclusive") {
      setShowModal(true);
      playChime();
    }
  };

  // Timer
  useEffect(() => {
    if (!isLive) return;
    const iv = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isLive]);

  // Trickle chat messages
  useEffect(() => {
    const timers = CHAT_SCRIPT.map((entry) =>
      setTimeout(() => {
        setMessages((prev) => [...prev, { agent: entry.agent, text: entry.text, id: ++msgIdRef.current }]);
        // Occasional tip
        if (Math.random() < 0.2) {
          const amount = [5, 10, 20][Math.floor(Math.random() * 3)];
          setTips((t) => t + amount);
          setEarnings((e) => e + amount);
        }
      }, entry.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const efficiencyRatio = timer > 0 ? ((timer * 0.3) / timer * 100).toFixed(1) : "0.0";

  // Highlight style for active zone
  const highlight = (zone: string) =>
    tourActive && currentZone === zone
      ? {
          position: "relative" as const,
          zIndex: 51,
          boxShadow: "0 0 0 2px #F4B8C8, 0 0 0 6px rgba(244,184,200,0.15)",
          borderRadius: "6px",
          transition: "box-shadow 200ms ease",
        }
      : { position: "relative" as const };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF", fontFamily: "'JetBrains Mono', monospace", display: "flex", flexDirection: "column" }}>

      {/* ── Tour overlay ── */}
      {tourActive && !showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.42)", zIndex: 50, pointerEvents: "none" }} />
      )}

      {/* ── gooner_os > tour_mode label ── */}
      {tourActive && (
        <div style={{ position: "fixed", top: 10, left: 14, zIndex: 400, fontSize: "9px", color: "#F4B8C8", letterSpacing: "0.08em", pointerEvents: "none" }}>
          gooner_os {">"} tour_mode
        </div>
      )}

      {/* ── Tour tooltip ── */}
      {tourActive && !showModal && (
        <TourTooltip
          stopIndex={tourStop}
          totalStops={TOUR_STOPS.length}
          text={TOUR_STOPS[tourStop].text}
          targetRef={activeRef}
          isModal={isModalStop}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
      {tourActive && showModal && (
        <TourTooltip
          stopIndex={tourStop}
          totalStops={TOUR_STOPS.length}
          text={TOUR_STOPS[tourStop].text}
          targetRef={modalRef}
          isModal={true}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}

      {/* ── Exclusive chat modal ── */}
      {showModal && (
        <ExclusiveChatModal modalRef={modalRef} onAccept={goNext} onDecline={goNext} />
      )}

      {/* ── Top nav ── */}
      <div style={{ height: "44px", borderBottom: "0.5px solid #CCCCCC", display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px", gap: "0", flexShrink: 0, position: "relative", zIndex: 52 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#000000", letterSpacing: "-0.01em", marginRight: "32px" }}>
          gooner_os
        </div>

        <div style={{ display: "flex", gap: "24px", marginRight: "auto" }}>
          {["Home", "Earnings Report", "Settings", "Help"].map((item) => (
            <span key={item} style={{ fontSize: "11px", color: item === "Home" ? "#000000" : "#888888", cursor: "pointer", letterSpacing: "0.01em" }}>
              {item}
            </span>
          ))}
        </div>

        {/* Metrics — always visible, tour stops 5 & 6 */}
        <div style={{ display: "flex", gap: "28px", alignItems: "center", marginRight: "28px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.06em", marginBottom: "1px" }}>EFFICIENCY</div>
            <div style={{ fontSize: "11px", color: "#000000" }}>{efficiencyRatio}%</div>
          </div>
          <div
            ref={tipsRef as React.RefObject<HTMLDivElement>}
            style={{ ...highlight("tips"), textAlign: "center", padding: "2px 6px" }}
          >
            <div style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.06em", marginBottom: "1px" }}>TIPS</div>
            <div style={{ fontSize: "11px", color: "#000000" }}>${tips.toFixed(2)}</div>
          </div>
          <div
            ref={earningsRef as React.RefObject<HTMLDivElement>}
            style={{ ...highlight("earnings"), textAlign: "center", padding: "2px 6px" }}
          >
            <div style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.06em", marginBottom: "1px" }}>EARNINGS</div>
            <div style={{ fontSize: "11px", color: "#000000" }}>${earnings.toFixed(2)}</div>
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#888888" }}>{chosenName}</span>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#F4B8C8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#000000", fontWeight: 500 }}>
            {chosenName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left panel (~55%) ── */}
        <div style={{ width: "55%", display: "flex", flexDirection: "column", borderRight: "0.5px solid #CCCCCC" }}>

          {/* Camera zone */}
          <div
            ref={cameraRef}
            style={{
              ...highlight("camera"),
              flex: 1,
              backgroundColor: "#111111",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "260px",
              margin: "12px 12px 0 12px",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: "9px", color: "#666666", letterSpacing: "0.1em", position: "absolute", top: "20px", left: "20px" }}>
              ● OFFLINE
            </div>
            {/* Camera icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" fill="#1E1E1E" stroke="#333" strokeWidth="1" />
              <circle cx="24" cy="24" r="10" stroke="#444" strokeWidth="2" />
              <circle cx="24" cy="24" r="4" fill="#333" />
            </svg>
            <div style={{ fontSize: "10px", color: "#444444", marginTop: "12px", letterSpacing: "0.08em" }}>no signal</div>
          </div>

          {/* Start Show + stopwatch */}
          <div style={{ padding: "10px 12px 0 12px", display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setIsLive((v) => !v)}
              style={{
                flex: 1,
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: 500,
                padding: "9px 0",
                backgroundColor: isLive ? "#000000" : "#FFFFFF",
                color: isLive ? "#FFFFFF" : "#000000",
                border: "0.5px solid #CCCCCC",
                borderRadius: "6px",
                cursor: "pointer",
                outline: "none",
                letterSpacing: "0.02em",
                transition: "background-color 120ms",
              }}
            >
              {isLive ? "Stop Show" : "Start Show"}
            </button>
            <div style={{ fontSize: "12px", color: isLive ? "#000000" : "#AAAAAA", letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums", minWidth: "48px", textAlign: "right" }}>
              {isLive ? "⏺ " : "⏱ "}{formatTime(timer)}
            </div>
          </div>

          {/* Rates zone */}
          <div
            ref={ratesRef}
            style={{
              ...highlight("rates"),
              margin: "10px 12px 0 12px",
              padding: "14px 16px",
              border: "0.5px solid #EEEEEE",
              borderRadius: "6px",
            }}
          >
            <div style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.08em", marginBottom: "8px" }}>RATE / MINUTE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                onClick={() => setRate((r) => Math.max(5, r - 5))}
                style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCCCCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
              >
                −
              </button>
              <div style={{ fontSize: "22px", fontWeight: 500, color: "#000000", minWidth: "80px", textAlign: "center" }}>
                ${rate}.00
              </div>
              <button
                onClick={() => setRate((r) => Math.min(5000, r + 5))}
                style={{ fontFamily: "inherit", width: "28px", height: "28px", border: "0.5px solid #CCCCCC", borderRadius: "4px", background: "transparent", cursor: "pointer", fontSize: "14px", color: "#000000", display: "flex", alignItems: "center", justifyContent: "center", outline: "none" }}
              >
                +
              </button>
              <div style={{ fontSize: "10px", color: "#AAAAAA", marginLeft: "auto" }}>$5 – $5,000</div>
            </div>
          </div>

          {/* Session info */}
          <div style={{ padding: "10px 12px", display: "flex", gap: "16px" }}>
            {[["Stream Quality", "Offline"], ["Bitrate", "---"], ["Resolution", "---"]].map(([label, val]) => (
              <div key={label} style={{ flex: 1 }}>
                <div style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.06em", marginBottom: "2px" }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: "11px", color: "#888888" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Mascot reserve zone */}
          <div style={{ borderTop: "0.5px dashed #EEEEEE", height: "40px", display: "flex", alignItems: "center", paddingLeft: "16px", marginTop: "auto", flexShrink: 0 }}>
            <span style={{ fontSize: "8px", color: "#DDDDDD", letterSpacing: "0.1em" }}>[ MASCOT ZONE — RESERVED ]</span>
          </div>
        </div>

        {/* ── Right panel (~45%) ── */}
        <div
          ref={chatRef}
          style={{
            ...highlight("chat"),
            width: "45%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel header / mode */}
          <div style={{ padding: "8px 16px", borderBottom: "0.5px solid #EEEEEE", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ fontSize: "10px", color: "#888888" }}>Free Chat</span>
            <span style={{ fontSize: "10px", color: "#AAAAAA" }}>{new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          {/* Member tabs */}
          <div style={{ display: "flex", borderBottom: "0.5px solid #EEEEEE", flexShrink: 0 }}>
            {(["all", "paid", "guest"] as const).map((tab) => {
              const count = tab === "all" ? messages.length : tab === "paid" ? 0 : messages.length;
              return (
                <button
                  key={tab}
                  onClick={() => setChatTab(tab)}
                  style={{
                    fontFamily: "inherit",
                    flex: 1,
                    padding: "8px 0",
                    fontSize: "11px",
                    color: chatTab === tab ? "#000000" : "#888888",
                    background: "transparent",
                    border: "none",
                    borderBottom: chatTab === tab ? "1px solid #000000" : "1px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                    letterSpacing: "0.02em",
                    textTransform: "capitalize",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}: {count}
                </button>
              );
            })}
          </div>

          {/* Chat feed */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.length === 0 && (
              <div style={{ fontSize: "11px", color: "#CCCCCC", textAlign: "center", marginTop: "40px" }}>
                waiting for agents...
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#F5F5F5", border: "0.5px solid #EEEEEE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "#888888", flexShrink: 0 }}>
                  {msg.agent.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#888888", marginRight: "6px" }}>{msg.agent}</span>
                  <span style={{ fontSize: "12px", color: "#000000" }}>{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ borderTop: "0.5px solid #EEEEEE", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", color: "#888888", whiteSpace: "nowrap" }}>To All:</span>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder=""
              style={{ flex: 1, border: "none", outline: "none", fontFamily: "inherit", fontSize: "12px", color: "#000000", backgroundColor: "transparent" }}
            />
            <button
              onClick={() => {
                if (!chatInput.trim()) return;
                setMessages((prev) => [...prev, { agent: chosenName, text: chatInput, id: ++msgIdRef.current }]);
                setChatInput("");
              }}
              style={{ fontFamily: "inherit", fontSize: "11px", border: "0.5px solid #CCCCCC", borderRadius: "4px", background: "transparent", padding: "4px 10px", cursor: "pointer", outline: "none", color: "#888888" }}
            >
              send
            </button>
          </div>

          {/* Potential members */}
          <div style={{ padding: "6px 16px 8px", borderTop: "0.5px solid #EEEEEE", flexShrink: 0 }}>
            <span style={{ fontSize: "9px", color: "#AAAAAA", letterSpacing: "0.06em" }}>
              Potential Members: {messages.length}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(1);
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState<ModeId | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [chosenName, setChosenName] = useState<string | null>(null);

  const go = (n: ScreenId) => {
    setVisible(false);
    setTimeout(() => { setScreen(n); setVisible(true); }, 140);
  };

  const types = mode === "camera" ? CAMERA_TYPES : TEXT_TYPES;
  const selectedType = types.find((t) => t.id === type);
  const nameOptions = NAME_SUGGESTIONS[type ?? "Jester"] ?? ["Echo", "Lace", "Haze"];

  if (screen === 6) {
    return <StreamDashboard chosenName={chosenName ?? "Unknown"} />;
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: "#FFFFFF", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: "480px", width: "100%", paddingTop: "48px", paddingLeft: "24px", paddingRight: "24px", paddingBottom: "64px", opacity: visible ? 1 : 0, transition: "opacity 140ms ease" }}>

        {screen === 1 && (
          <Screen1 mode={mode} setMode={(m) => setMode(m)} onContinue={() => { setType(null); go(2); }} />
        )}
        {screen === 2 && (
          <Screen2 types={types} type={type} setType={setType} onContinue={() => go(3)} />
        )}
        {screen === 3 && (
          <Screen3 typeName={selectedType?.label ?? ""} nameInput={nameInput} setNameInput={setNameInput} onEnter={() => go(4)} />
        )}
        {screen === 4 && (
          <Screen4 typeName={selectedType?.label ?? ""} inputName={nameInput} nameOptions={nameOptions} chosenName={chosenName} setChosenName={setChosenName} onConfirm={() => go(5)} />
        )}
        {screen === 5 && (
          <Screen5 chosenName={chosenName ?? nameOptions[0]} onBegin={() => go(6)} />
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
