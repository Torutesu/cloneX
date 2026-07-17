"use client";

// SCR-001: デモ入口ページ
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { LANG_NAMES, Lang, t } from "@/lib/i18n";

type EmployeeInfo = {
  productName: string;
  persona: { displayName: string; avatarPreset: string; accentColor: string };
  languages: string[];
};

export default function DemoEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<EmployeeInfo | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [language, setLanguage] = useState("ja");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/employees/${slug}`).then(async (res) => {
      if (!res.ok) {
        setUnavailable(true);
        return;
      }
      const data: EmployeeInfo = await res.json();
      setInfo(data);
      const browserLang = navigator.language?.slice(0, 2);
      setLanguage(data.languages.includes(browserLang) ? browserLang : data.languages[0] ?? "ja");
    });
  }, [slug]);

  async function start() {
    setBusy(true);
    const res = await fetch("/api/public/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, buyerName: name, buyerCompany: company, language }),
    });
    if (res.ok) {
      const { session } = await res.json();
      router.push(`/d/${slug}/s/${session.id}`);
    } else {
      setBusy(false);
      setUnavailable(true);
    }
  }

  if (unavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="card max-w-md p-8 text-center">
          <p className="text-lg font-bold">{t("unavailable", language)}</p>
        </div>
      </main>
    );
  }

  if (!info) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-24 w-24 animate-pulse rounded-full" style={{ background: "var(--brand-border)" }} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-md space-y-5 p-8 text-center">
        <div className="flex justify-center">
          <Avatar
            preset={info.persona.avatarPreset}
            accentColor={info.persona.accentColor}
            state="idle"
            size={112}
            testId="avatar-idle"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold">
            {language === "ja" ? `${info.productName} ${t("welcomeTitle", language)}` : `${info.productName}${t("welcomeTitle", language)}`}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--brand-text-muted)" }}>
            {info.persona.displayName}
            {t("guideIntro", language)}
          </p>
        </div>
        <div className="space-y-3 text-left">
          <div>
            <label className="label">{t("yourName", language)}</label>
            <input data-testid="buyer-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("company", language)}</label>
            <input data-testid="buyer-company" className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="label">{t("language", language)}</label>
            <select
              data-testid="language-select"
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {info.languages.map((l) => (
                <option key={l} value={l}>
                  {LANG_NAMES[l as Lang] ?? l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button data-testid="start-demo" className="btn btn-primary w-full justify-center" onClick={start} disabled={busy}>
          {t("startDemo", language)}
        </button>
      </div>
    </main>
  );
}
