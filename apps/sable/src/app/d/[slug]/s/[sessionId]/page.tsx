"use client";

// SCR-002: ライブデモセッション ★コア
// 共有デモステージ(iframe+擬似AIカーソル)+ アバター + トランスクリプト + 多言語即時切替
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarState } from "@/components/Avatar";
import { LANG_NAMES, Lang, t } from "@/lib/i18n";

type Turn = {
  id: string;
  role: "BUYER" | "AI";
  text: string;
  language: string;
  meta?: { referencedNodeIds?: string[]; gapRecorded?: boolean; narration?: boolean } | null;
  createdAt: string;
};
type Step = { order: number; title: string; route: string; selector: string | null };
type SessionData = {
  session: {
    id: string;
    mode: string;
    status: string;
    language: string;
    currentStepOrder: number;
    slug: string;
  };
  productName: string;
  persona: { displayName: string; avatarPreset: string; accentColor: string; languages: string[] };
  steps: Step[];
  turns: Turn[];
  events: { id: string; type: string; payload: Record<string, unknown>; createdAt: string }[];
};
type Item =
  | { kind: "turn"; turn: Turn }
  | { kind: "divider"; to: string; id: string }
  | { kind: "error"; id: string; text: string };

const TTS_ON = process.env.NEXT_PUBLIC_TTS !== "off";

export default function LiveSessionPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [lang, setLang] = useState("ja");
  const [currentStep, setCurrentStep] = useState(0);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [cursor, setCursor] = useState({ x: 300, y: 200 });
  const [highlight, setHighlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const speak = useCallback((text: string, language: string) => {
    if (speakTimer.current) clearTimeout(speakTimer.current);
    setAvatarState("speaking");
    const done = () => setAvatarState("idle");
    if (TTS_ON && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = { ja: "ja-JP", en: "en-US", zh: "zh-CN", es: "es-ES" }[language] ?? "ja-JP";
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
      // TTSが発火しない環境向けの保険
      speakTimer.current = setTimeout(done, Math.min(20000, 3000 + text.length * 120));
    } else {
      speakTimer.current = setTimeout(done, Math.min(5000, Math.max(1500, text.length * 45)));
    }
  }, []);

  // 初期ロード: turns + LANGUAGE_SWITCHイベントを時系列マージ
  useEffect(() => {
    fetch(`/api/public/sessions/${sessionId}`).then(async (res) => {
      if (!res.ok) return;
      const d: SessionData = await res.json();
      if (d.session.status === "ENDED") {
        router.replace(`/d/${slug}/s/${sessionId}/done`);
        return;
      }
      const merged: Item[] = [
        ...d.turns.map((turn) => ({ kind: "turn" as const, turn })),
        ...d.events
          .filter((e) => e.type === "LANGUAGE_SWITCH")
          .map((e) => ({
            kind: "divider" as const,
            to: String(e.payload.to),
            id: e.id,
            createdAt: e.createdAt,
          })),
      ].sort((a, b) => {
        const ta = a.kind === "turn" ? a.turn.createdAt : (a as { createdAt: string }).createdAt;
        const tb = b.kind === "turn" ? b.turn.createdAt : (b as { createdAt: string }).createdAt;
        return ta.localeCompare(tb);
      });
      setData(d);
      setItems(merged);
      setLang(d.session.language);
      setCurrentStep(d.session.currentStepOrder);
      const last = d.turns[d.turns.length - 1];
      if (last?.role === "AI") speak(last.text, last.language);
    });
    setMicAvailable(
      typeof window !== "undefined" &&
        !!(window as unknown as Record<string, unknown>).webkitSpeechRecognition,
    );
  }, [sessionId, slug, router, speak]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items]);

  // ステージ: iframeロード後にselector位置へカーソル+ハイライトを移動
  const positionCursor = useCallback(() => {
    const step = data?.steps.find((s) => s.order === currentStep);
    const iframe = iframeRef.current;
    const stage = stageRef.current;
    if (!step || !iframe || !stage) return;
    try {
      const doc = iframe.contentDocument;
      const el = step.selector ? doc?.querySelector(step.selector) : null;
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlight({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
        setCursor({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      } else {
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        setHighlight(null);
        setCursor({ x: w / 2, y: h / 2 });
      }
    } catch {
      setHighlight(null);
    }
  }, [data, currentStep]);

  useEffect(() => {
    const timer = setTimeout(positionCursor, 250);
    return () => clearTimeout(timer);
  }, [positionCursor]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center gap-3">
        <p style={{ color: "var(--brand-text-muted)" }}>{t("preparing", lang)}</p>
      </main>
    );
  }

  const { persona, steps } = data;
  const step = steps.find((s) => s.order === currentStep) ?? null;
  const isRehearsal = data.session.mode === "REHEARSAL";

  async function sendMessage(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setAvatarState("thinking");
    setInput("");
    const res = await fetch(`/api/public/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const { buyerTurn, aiTurn, directives } = await res.json();
      setItems((prev) => [
        ...prev,
        ...(directives.language
          ? [{ kind: "divider" as const, to: directives.language, id: `dv-${Date.now()}` }]
          : []),
        { kind: "turn", turn: buyerTurn },
        { kind: "turn", turn: aiTurn },
      ]);
      if (directives.language) setLang(directives.language);
      if (directives.stepOrder) setCurrentStep(directives.stepOrder);
      speak(aiTurn.text, aiTurn.language);
    } else {
      setAvatarState("idle");
      setItems((prev) => [...prev, { kind: "error", id: `er-${Date.now()}`, text }]);
    }
    setBusy(false);
  }

  async function changeStep(order: number) {
    if (order < 1 || order > steps.length || busy) return;
    const res = await fetch(`/api/public/sessions/${sessionId}/step`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ order }),
    });
    if (res.ok) {
      const { narrationTurn } = await res.json();
      setCurrentStep(order);
      if (narrationTurn) {
        setItems((prev) => [...prev, { kind: "turn", turn: narrationTurn }]);
        speak(narrationTurn.text, narrationTurn.language);
      }
    }
  }

  async function switchLanguage(language: string) {
    if (language === lang) return;
    const res = await fetch(`/api/public/sessions/${sessionId}/language`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language }),
    });
    if (res.ok) {
      setLang(language);
      setItems((prev) => [...prev, { kind: "divider", to: language, id: `dv-${Date.now()}` }]);
    }
  }

  async function endSession() {
    await fetch(`/api/public/sessions/${sessionId}/end`, { method: "POST" });
    router.push(`/d/${slug}/s/${sessionId}/done`);
  }

  function startMic() {
    const SR = (window as unknown as Record<string, new () => unknown>).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR() as {
      lang: string;
      onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
      start: () => void;
    };
    rec.lang = { ja: "ja-JP", en: "en-US", zh: "zh-CN", es: "es-ES" }[lang] ?? "ja-JP";
    rec.onresult = (e) => setInput(e.results[0]?.[0]?.transcript ?? "");
    rec.start();
  }

  return (
    <main className="flex h-screen flex-col">
      {isRehearsal && (
        <div
          data-testid="rehearsal-banner"
          className="px-4 py-1.5 text-center text-xs font-bold text-white"
          style={{ background: "var(--brand-warning)" }}
        >
          {t("rehearsalBanner", lang)}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {/* ===== デモステージ ===== */}
        <section className="flex min-w-0 flex-1 flex-col p-3">
          <div
            ref={stageRef}
            className="relative min-h-0 flex-1 overflow-hidden rounded-xl"
            style={{ background: "var(--brand-stage-bg)" }}
          >
            {step ? (
              <>
                <iframe
                  ref={iframeRef}
                  data-testid="stage-iframe"
                  src={step.route}
                  title="demo stage"
                  className="h-full w-full border-0 bg-white"
                  onLoad={positionCursor}
                />
                {highlight && (
                  <div
                    data-testid="highlight"
                    className="stage-highlight pointer-events-none absolute"
                    style={{
                      left: highlight.x,
                      top: highlight.y,
                      width: highlight.w,
                      height: highlight.h,
                    }}
                  />
                )}
                <div
                  data-testid="ai-cursor"
                  className="ai-cursor pointer-events-none absolute z-10"
                  style={{ left: cursor.x, top: cursor.y }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path
                      d="M4 2 L20 12 L12 13.5 L9 21 Z"
                      fill="var(--brand-primary)"
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span
                    className="ml-3 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: "var(--brand-primary)" }}
                  >
                    {persona.displayName}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/80">
                <Avatar preset={persona.avatarPreset} accentColor={persona.accentColor} state="idle" size={72} testId="stage-placeholder-avatar" />
                <p className="text-sm">{data.productName}</p>
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center justify-center gap-3 text-sm">
            <button
              data-testid="prev-step"
              className="btn btn-secondary"
              onClick={() => changeStep(currentStep - 1)}
              disabled={currentStep <= 1}
            >
              {t("prevStep", lang)}
            </button>
            <span data-testid="step-indicator" style={{ color: "var(--brand-text-muted)" }}>
              {t("step", lang)} {currentStep}/{steps.length}
            </span>
            <button
              data-testid="next-step"
              className="btn btn-secondary"
              onClick={() => changeStep(currentStep + 1)}
              disabled={currentStep >= steps.length}
            >
              {t("nextStep", lang)}
            </button>
          </div>
        </section>

        {/* ===== 右パネル: アバター+トランスクリプト ===== */}
        <aside className="flex w-80 shrink-0 flex-col border-l" style={{ borderColor: "var(--brand-border)" }}>
          <div className="flex items-center gap-3 p-3">
            <Avatar
              preset={persona.avatarPreset}
              accentColor={persona.accentColor}
              state={avatarState}
              size={56}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{persona.displayName}</p>
              <p className="text-xs" style={{ color: "var(--brand-text-muted)" }}>
                {avatarState === "speaking" ? `● ${t("speaking", lang)}` : data.productName}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span data-testid="lang-badge" className="badge badge-muted">
                🌐 {LANG_NAMES[lang as Lang] ?? lang}
              </span>
              <select
                data-testid="lang-manual"
                aria-label="language"
                className="rounded border px-1 text-[10px]"
                style={{ borderColor: "var(--brand-border)" }}
                value={lang}
                onChange={(e) => switchLanguage(e.target.value)}
              >
                {persona.languages.map((l) => (
                  <option key={l} value={l}>
                    {LANG_NAMES[l as Lang] ?? l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
            {items.map((item) =>
              item.kind === "divider" ? (
                <div
                  key={item.id}
                  data-testid="lang-divider"
                  className="flex items-center gap-2 text-[11px]"
                  style={{ color: "var(--brand-text-muted)" }}
                >
                  <span className="h-px flex-1" style={{ background: "var(--brand-border)" }} />
                  — {LANG_NAMES[item.to as Lang] ?? item.to} {t("switchedTo", lang)} —
                  <span className="h-px flex-1" style={{ background: "var(--brand-border)" }} />
                </div>
              ) : item.kind === "error" ? (
                <div key={item.id} className="rounded-lg p-2 text-xs" style={{ background: "color-mix(in srgb, var(--brand-danger) 10%, white)", color: "var(--brand-danger)" }}>
                  {t("aiError", lang)}{" "}
                  <button className="underline" onClick={() => sendMessage(item.text)}>
                    {t("retry", lang)}
                  </button>
                </div>
              ) : (
                <div
                  key={item.turn.id}
                  data-testid="turn"
                  data-role={item.turn.role}
                  data-lang={item.turn.language}
                  className="rounded-xl p-2.5 text-sm"
                  style={
                    item.turn.role === "AI"
                      ? { background: "color-mix(in srgb, var(--brand-primary) 8%, white)" }
                      : { background: "var(--brand-surface)", border: "1px solid var(--brand-border)" }
                  }
                >
                  <p className="mb-0.5 text-[10px] font-bold" style={{ color: "var(--brand-text-muted)" }}>
                    {item.turn.role === "AI" ? persona.displayName : data.session.mode === "REHEARSAL" ? "You" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap">{item.turn.text}</p>
                  <p className="mt-1 flex gap-2 text-[10px]" style={{ color: "var(--brand-text-muted)" }}>
                    {item.turn.role === "AI" &&
                      (item.turn.meta?.referencedNodeIds?.length ?? 0) > 0 && (
                        <span data-testid="refs">
                          📚 {item.turn.meta!.referencedNodeIds!.length}
                          {t("refs", lang)}
                        </span>
                      )}
                    {item.turn.role === "AI" && item.turn.meta?.gapRecorded && (
                      <span data-testid="gap-flag" style={{ color: "var(--brand-warning)" }}>
                        ⚠
                      </span>
                    )}
                  </p>
                </div>
              ),
            )}
          </div>
        </aside>
      </div>

      {/* ===== 入力バー ===== */}
      <footer className="flex items-center gap-2 border-t p-3" style={{ borderColor: "var(--brand-border)" }}>
        {micAvailable && (
          <button className="btn btn-secondary" onClick={startMic} aria-label="mic">
            🎤
          </button>
        )}
        <input
          data-testid="chat-input"
          className="input flex-1"
          placeholder={t("inputPlaceholder", lang)}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={busy}
        />
        <button data-testid="chat-send" className="btn btn-primary" onClick={() => sendMessage(input)} disabled={busy}>
          {t("send", lang)}
        </button>
        <button data-testid="end-session" className="btn btn-danger" onClick={() => setConfirmingEnd(true)}>
          {t("endSession", lang)}
        </button>
      </footer>

      {confirmingEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-xs space-y-4 p-6 text-center">
            <p className="font-bold">{t("confirmEnd", lang)}</p>
            <div className="flex justify-center gap-2">
              <button className="btn btn-secondary" onClick={() => setConfirmingEnd(false)}>
                {t("cancel", lang)}
              </button>
              <button data-testid="confirm-end" className="btn btn-danger" onClick={endSession}>
                {t("confirmEndYes", lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
