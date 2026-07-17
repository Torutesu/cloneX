"use client";

// SCR-019: セッション詳細/リプレイ
import { use, useEffect, useState } from "react";
import Link from "next/link";

type Turn = {
  id: string;
  role: "BUYER" | "AI";
  text: string;
  language: string;
  meta?: { referencedNodeIds?: string[] } | null;
  createdAt: string;
};
type Event = { id: string; type: string; payload: Record<string, unknown>; createdAt: string };
type Detail = {
  session: {
    id: string;
    buyerName: string | null;
    buyerCompany: string | null;
    status: string;
    startedAt: string;
    endedAt: string | null;
  };
  turns: Turn[];
  events: Event[];
  qualification: {
    useCase: string | null;
    teamSize: string | null;
    timeline: string | null;
    interest: number | null;
    summary: string;
  } | null;
};

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ aiId: string; sessionId: string }>;
}) {
  const { aiId, sessionId } = use(params);
  const [data, setData] = useState<Detail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!active) return;
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const d: Detail = await res.json();
      setData(d);
      if (d.session.status === "ACTIVE") setTimeout(load, 4000);
    }
    load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (notFound) return <main className="p-6">セッションが見つかりません</main>;
  if (!data) return <main className="p-6"><div className="card h-40 animate-pulse" /></main>;

  const { session, qualification } = data;
  const timeline = [
    ...data.turns.map((t) => ({ kind: "turn" as const, at: t.createdAt, turn: t })),
    ...data.events.map((e) => ({ kind: "event" as const, at: e.createdAt, event: e })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const durationMin = session.endedAt
    ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
    : null;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold">
          {session.buyerName ?? "(匿名)"}
          {session.buyerCompany ? `(${session.buyerCompany})` : ""}
        </h1>
        <span className="text-sm" style={{ color: "var(--brand-text-muted)" }}>
          {new Date(session.startedAt).toLocaleString("ja-JP")}
          {durationMin !== null ? ` ・ ${durationMin}分` : ""}
        </span>
        {session.status === "ACTIVE" && <span className="badge badge-success">● 進行中</span>}
      </div>

      {qualification && (
        <section data-testid="qualification-card" className="card space-y-2 p-4">
          <h2 className="text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
            資格確認(AIF-005)
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>用途: <strong>{qualification.useCase ?? "-"}</strong></p>
            <p>規模: <strong>{qualification.teamSize ?? "-"}</strong></p>
            <p>導入時期: <strong>{qualification.timeline ?? "-"}</strong></p>
            <p>
              関心度:{" "}
              <strong>
                {qualification.interest
                  ? "★".repeat(qualification.interest) + "☆".repeat(5 - qualification.interest)
                  : "-"}
              </strong>
            </p>
          </div>
          <p className="rounded-lg p-2 text-sm" style={{ background: "color-mix(in srgb, var(--brand-primary) 6%, white)" }}>
            {qualification.summary}
          </p>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--brand-text-muted)" }}>
          タイムライン
        </h2>
        <div className="space-y-2">
          {timeline.map((item) =>
            item.kind === "event" ? (
              <EventRow key={item.event.id} event={item.event} aiId={aiId} />
            ) : (
              <div key={item.turn.id} className="flex gap-2 text-sm">
                <span className="w-12 shrink-0 text-xs" style={{ color: "var(--brand-text-muted)" }}>
                  {new Date(item.at).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <div>
                  <span className="font-bold">[{item.turn.role === "AI" ? "AI" : "買い手"}]</span>{" "}
                  {item.turn.text}
                  {item.turn.role === "AI" && (item.turn.meta?.referencedNodeIds?.length ?? 0) > 0 && (
                    <span className="ml-1 text-xs" style={{ color: "var(--brand-text-muted)" }}>
                      📚{item.turn.meta!.referencedNodeIds!.length}
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}

function EventRow({ event, aiId }: { event: Event; aiId: string }) {
  const time = new Date(event.createdAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  let content: React.ReactNode = null;
  switch (event.type) {
    case "SESSION_START":
      content = <>▶ セッション開始({String(event.payload.language)})</>;
      break;
    case "STEP_SHOWN":
      content = <>🖥 Step {String(event.payload.order)}: {String(event.payload.title)} 表示</>;
      break;
    case "LANGUAGE_SWITCH":
      content = <>🌐 {String(event.payload.from)}→{String(event.payload.to)} に切替</>;
      break;
    case "GAP_RECORDED":
      content = (
        <>
          ⚠ 未回答質問を記録「{String(event.payload.question)}」{" "}
          <Link href={`/app/${aiId}/brain/knowledge?gap=${String(event.payload.gapId)}`} className="underline">
            ナレッジで解消
          </Link>
        </>
      );
      break;
    case "SESSION_END":
      content = <>⏹ セッション終了</>;
      break;
  }
  return (
    <div data-testid="tl-event" data-type={event.type} className="flex gap-2 text-xs" style={{ color: "var(--brand-text-muted)" }}>
      <span className="w-12 shrink-0">{time}</span>
      <span>{content}</span>
    </div>
  );
}
