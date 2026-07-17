"use client";

// SCR-003: セッション終了/フォローアップ
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { t } from "@/lib/i18n";

type DoneData = {
  session: { status: string; language: string; summary: string | null };
  productName: string;
  productUrl: string;
  persona: { displayName: string; avatarPreset: string; accentColor: string };
  turns: { id: string; role: string; text: string }[];
};

export default function SessionDonePage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DoneData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetch(`/api/public/sessions/${sessionId}`).then(async (res) => {
      if (!res.ok) return;
      const d: DoneData = await res.json();
      if (d.session.status === "ACTIVE") {
        router.replace(`/d/${slug}/s/${sessionId}`);
        return;
      }
      setData(d);
    });
  }, [sessionId, slug, router]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p style={{ color: "var(--brand-text-muted)" }}>{t("generatingSummary", "ja")}</p>
      </main>
    );
  }

  const lang = data.session.language;

  return (
    <main className="flex min-h-screen items-start justify-center p-4 py-12">
      <div className="card w-full max-w-lg space-y-5 p-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Avatar
              preset={data.persona.avatarPreset}
              accentColor={data.persona.accentColor}
              state="idle"
              size={88}
            />
          </div>
          <h1 className="mt-2 text-xl font-bold">{t("thanks", lang)}</h1>
        </div>

        {data.session.summary && (
          <section>
            <h2 className="mb-1 text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
              ■ {t("summaryTitle", lang)}
            </h2>
            <p data-testid="summary" className="whitespace-pre-wrap rounded-lg p-3 text-sm" style={{ background: "color-mix(in srgb, var(--brand-primary) 6%, white)" }}>
              {data.session.summary}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
            ■ {t("nextSteps", lang)}
          </h2>
          <div className="flex flex-wrap gap-2">
            <a
              data-testid="product-link"
              className="btn btn-primary"
              href={data.productUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("viewProduct", lang)}
            </a>
            <button
              data-testid="transcript-accordion"
              className="btn btn-secondary"
              onClick={() => setShowTranscript((v) => !v)}
            >
              {t("viewTranscript", lang)} {showTranscript ? "▲" : "▼"}
            </button>
          </div>
        </section>

        {showTranscript && (
          <section className="space-y-1.5 border-t pt-3" style={{ borderColor: "var(--brand-border)" }}>
            {data.turns.map((turn) => (
              <p key={turn.id} data-testid="done-turn" className="text-xs">
                <strong>{turn.role === "AI" ? data.persona.displayName : "You"}:</strong> {turn.text}
              </p>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
