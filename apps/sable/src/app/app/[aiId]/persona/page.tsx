"use client";

// SCR-015: ペルソナ設定 [USER-REQ: 簡易アバター必須]
import { use, useEffect, useState } from "react";
import { Avatar, AvatarState } from "@/components/Avatar";
import { LANG_NAMES, SUPPORTED_LANGS } from "@/lib/i18n";

type Persona = {
  displayName: string;
  avatarPreset: string;
  accentColor: string;
  tone: string;
  languages: string[];
  greeting: Record<string, string>;
};

const PRESETS = ["CIRCLE_A", "CIRCLE_B", "ROBOT", "SPARK"];
const TONES = [
  { value: "FRIENDLY", label: "フレンドリー" },
  { value: "PROFESSIONAL", label: "プロフェッショナル" },
  { value: "ENERGETIC", label: "元気" },
];

export default function PersonaPage({ params }: { params: Promise<{ aiId: string }> }) {
  const { aiId } = use(params);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [previewState, setPreviewState] = useState<AvatarState>("idle");
  const [greetingLang, setGreetingLang] = useState("ja");
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch(`/api/ai-employees/${aiId}`).then(async (res) => {
      if (res.ok) {
        const { employee } = await res.json();
        setPersona(employee.persona);
      }
    });
  }, [aiId]);

  // ライブプレビュー: idle → speaking → thinking をループ
  useEffect(() => {
    const states: AvatarState[] = ["idle", "speaking", "thinking"];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % states.length;
      setPreviewState(states[i]!);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!persona) return <main className="p-6"><div className="card h-64 animate-pulse" /></main>;

  async function save() {
    const res = await fetch(`/api/ai-employees/${aiId}/persona`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(persona),
    });
    if (res.ok) {
      setToast("保存しました");
    } else {
      setToast("保存できませんでした");
    }
    setTimeout(() => setToast(null), 3000);
  }

  async function generateGreeting() {
    setGenerating(true);
    const res = await fetch("/api/ai/greeting", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aiEmployeeId: aiId }),
    });
    if (res.ok) {
      const { greeting } = await res.json();
      setPersona((p) => (p ? { ...p, greeting } : p));
    }
    setGenerating(false);
  }

  function toggleLanguage(lang: string) {
    setPersona((p) => {
      if (!p) return p;
      const has = p.languages.includes(lang);
      if (has && p.languages.length <= 1) return p; // 最低1言語
      return { ...p, languages: has ? p.languages.filter((l) => l !== lang) : [...p.languages, lang] };
    });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-lg font-bold">ペルソナ設定</h1>

      <div className="card flex items-center justify-center p-6">
        <Avatar
          preset={persona.avatarPreset}
          accentColor={persona.accentColor}
          state={previewState}
          size={120}
          testId="avatar-preview"
        />
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">表示名</label>
          <input
            data-testid="display-name-input"
            className="input"
            value={persona.displayName}
            onChange={(e) => setPersona({ ...persona, displayName: e.target.value })}
          />
        </div>

        <div>
          <label className="label">アバター</label>
          <div className="flex gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                data-testid={`preset-${preset}`}
                className="rounded-xl border-2 p-2"
                style={{
                  borderColor: persona.avatarPreset === preset ? "var(--brand-primary)" : "var(--brand-border)",
                }}
                onClick={() => setPersona({ ...persona, avatarPreset: preset })}
              >
                <Avatar preset={preset} accentColor={persona.accentColor} size={56} testId={`preset-avatar-${preset}`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">アクセントカラー</label>
          <input
            data-testid="accent-color"
            type="color"
            className="h-9 w-16 cursor-pointer rounded border"
            style={{ borderColor: "var(--brand-border)" }}
            value={persona.accentColor}
            onChange={(e) => setPersona({ ...persona, accentColor: e.target.value })}
          />
        </div>

        <div>
          <label className="label">トーン</label>
          <div className="flex gap-3">
            {TONES.map((tone) => (
              <label key={tone.value} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="tone"
                  checked={persona.tone === tone.value}
                  onChange={() => setPersona({ ...persona, tone: tone.value })}
                />
                {tone.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">対応言語 [USER-REQ: 多言語即時切替]</label>
          <div className="flex gap-3">
            {SUPPORTED_LANGS.map((lang) => (
              <label key={lang} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  data-testid={`lang-${lang}`}
                  checked={persona.languages.includes(lang)}
                  onChange={() => toggleLanguage(lang)}
                />
                {LANG_NAMES[lang]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label">挨拶文</label>
            <button className="btn btn-secondary text-xs" onClick={generateGreeting} disabled={generating}>
              {generating ? "生成中…" : "AIで生成"}
            </button>
          </div>
          <div className="mb-1 flex gap-1">
            {SUPPORTED_LANGS.map((lang) => (
              <button
                key={lang}
                className={`badge ${greetingLang === lang ? "badge-success" : "badge-muted"}`}
                onClick={() => setGreetingLang(lang)}
              >
                {lang}
              </button>
            ))}
          </div>
          <textarea
            data-testid="greeting-text"
            className="input min-h-20"
            value={persona.greeting[greetingLang] ?? ""}
            onChange={(e) =>
              setPersona({ ...persona, greeting: { ...persona.greeting, [greetingLang]: e.target.value } })
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <button data-testid="save-persona" className="btn btn-primary" onClick={save}>
            保存
          </button>
          {toast && <span className="text-sm font-bold" style={{ color: "var(--brand-success)" }}>{toast}</span>}
        </div>
      </div>
    </main>
  );
}
