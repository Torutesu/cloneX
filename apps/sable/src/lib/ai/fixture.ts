// AI_MODE=fixture: 決定的な固定応答。E2Eはこのモードで走る
import {
  BrainBuildResult,
  ChatContext,
  ChatResult,
  InsightContext,
  InsightResult,
  SummaryContext,
  SummaryResult,
} from "./types";
import { matchesTitle, normalizeQuestion } from "./matching";

const NOT_SURE: Record<string, string> = {
  ja: "申し訳ありません、その点は手元の情報では分かりかねます。確認して追ってご連絡しますね。",
  en: "I'm sorry, I don't have that information at hand. Let me check with the team and follow up with you.",
  zh: "抱歉,这一点我目前没有确切信息。我会确认后再回复您。",
  es: "Lo siento, no tengo esa información a mano. Lo verificaré con el equipo y te responderé.",
};

const ANSWER_PREFIX: Record<string, (title: string) => string> = {
  ja: (t) => `${t}についてご説明しますね。`,
  en: (t) => `Here's what I can tell you about "${t}". `,
  zh: (t) => `关于「${t}」,为您说明。`,
  es: (t) => `Esto es lo que puedo contarte sobre "${t}". `,
};

export function fixtureChat(ctx: ChatContext): ChatResult {
  const matched = ctx.nodes.filter((n) => matchesTitle(ctx.question, n.title));
  const jumpStep = ctx.steps.find(
    (s) => s.order !== ctx.currentStepOrder && matchesTitle(ctx.question, s.title),
  );

  const top = matched[0];
  if (!top) {
    return {
      answer: NOT_SURE[ctx.language] ?? NOT_SURE.ja!,
      referencedNodeIds: [],
      confident: false,
    };
  }

  const prefix = (ANSWER_PREFIX[ctx.language] ?? ANSWER_PREFIX.ja!)(top.title);
  const showLine: Record<string, string> = {
    ja: " 実際の画面でお見せしますね。",
    en: " Let me show you on the actual screen.",
    zh: " 我在实际页面上给您演示。",
    es: " Déjame mostrártelo en la pantalla real.",
  };
  return {
    answer: prefix + top.body + (jumpStep ? (showLine[ctx.language] ?? showLine.ja) : ""),
    referencedNodeIds: [top.id],
    confident: true,
    jumpToStepOrder: jumpStep?.order,
  };
}

export function fixtureBuildBrain(productName: string): BrainBuildResult {
  return {
    nodes: [
      { kind: "FEATURE", title: "ダッシュボード", body: `${productName}のダッシュボードは、主要KPIをカードで一覧表示します。` },
      { kind: "FEATURE", title: "タスク管理(カンバンボード)", body: "タスクはカンバンボードでドラッグ&ドロップ管理できます。" },
      { kind: "FEATURE", title: "レポート機能", body: "週次・月次レポートを自動生成し、CSVエクスポートに対応します。" },
      { kind: "FEATURE", title: "通知とSlack連携", body: "更新はSlack・メールにリアルタイム通知されます。" },
      { kind: "FAQ", title: "料金体系", body: `${productName}にはフリープランと、1ユーザーあたり月額$10のProプランがあります。` },
      { kind: "FAQ", title: "無料トライアル", body: "Proプランは14日間の無料トライアルが利用できます。" },
      { kind: "FAQ", title: "データのセキュリティ", body: "データは暗号化して保存され、通信はTLSで保護されます。" },
      { kind: "OBJECTION", title: "他ツールとの違い", body: "レポート自動生成と連携の深さが強みです。既存データは移行ツールでインポートできます。" },
    ],
    steps: [
      {
        order: 1,
        title: "ダッシュボード概要",
        route: "/demo-target/dashboard",
        selector: ".kpi-cards",
        narration: {
          ja: "まずはダッシュボードです。主要KPIがひと目で分かります。",
          en: "First, the dashboard. You can see your key KPIs at a glance.",
          zh: "首先是仪表盘,主要KPI一目了然。",
          es: "Primero, el panel de control. Puedes ver tus KPI clave de un vistazo.",
        },
      },
      {
        order: 2,
        title: "カンバンボード",
        route: "/demo-target/board",
        selector: ".board-columns",
        narration: {
          ja: "次にカンバンボードです。ドラッグ&ドロップで直感的に管理できます。",
          en: "Next, the kanban board. Manage work intuitively with drag and drop.",
          zh: "接下来是看板,拖放即可直观管理。",
          es: "Luego, el tablero kanban. Gestiona el trabajo con arrastrar y soltar.",
        },
      },
      {
        order: 3,
        title: "レポート",
        route: "/demo-target/reports",
        selector: ".report-chart",
        narration: {
          ja: "こちらがレポートです。チャートが自動生成されます。",
          en: "Here are the reports. Charts are generated automatically.",
          zh: "这是报表,图表自动生成。",
          es: "Aquí están los informes. Los gráficos se generan automáticamente.",
        },
      },
      {
        order: 4,
        title: "設定と連携",
        route: "/demo-target/settings",
        selector: ".settings-form",
        narration: {
          ja: "最後に設定です。連携や通知をカスタマイズできます。以上です!",
          en: "Finally, settings. Configure integrations and notifications. That's it!",
          zh: "最后是设置,可以自定义集成和通知。演示结束!",
          es: "Por último, la configuración. Configura integraciones y notificaciones. ¡Eso es todo!",
        },
      },
    ],
    greeting: {
      ja: `こんにちは!${productName}のご案内を担当します。デモを始めますか?それともご質問からにしますか?`,
      en: `Hi! I'm your guide to ${productName}. Shall we start the demo, or do you have questions first?`,
      zh: `您好!我负责为您介绍${productName}。我们开始演示,还是先回答您的问题?`,
      es: `¡Hola! Soy tu guía de ${productName}. ¿Empezamos la demo o tienes preguntas primero?`,
    },
  };
}

/** ソース追加時の増分ナレッジ抽出(fixture: 固定2件) */
export function fixtureExtractNodes(
  sourceName: string,
  content: string,
): { kind: "FAQ" | "OTHER"; title: string; body: string }[] {
  const excerpt = content.slice(0, 120);
  return [
    { kind: "FAQ", title: `${sourceName}のポイント`, body: excerpt },
    { kind: "OTHER", title: `${sourceName}の補足`, body: `${sourceName}から抽出した補足情報です。${excerpt}` },
  ];
}

export function fixtureSummary(ctx: SummaryContext): SummaryResult {
  const name = ctx.buyerName ? `${ctx.buyerName}様` : "お客様";
  const companyPart = ctx.buyerCompany ? `(${ctx.buyerCompany})` : "";
  const stepsPart =
    ctx.shownStepTitles.length > 0 ? ctx.shownStepTitles.join("、") : "概要のみ";
  const questions = ctx.turns.filter((t) => t.role === "BUYER").map((t) => t.text);
  const gapPart =
    ctx.gapQuestions.length > 0
      ? ` 未回答の質問が${ctx.gapQuestions.length}件あり、フォローアップが必要です。`
      : "";
  const summaryJa = `${name}${companyPart}に${ctx.productName}をご案内しました。ご覧いただいた画面: ${stepsPart}。ご質問は${questions.length}件でした。${gapPart}`;
  const summaryEn = `We walked ${ctx.buyerName ?? "the buyer"} through ${ctx.productName}. Screens shown: ${stepsPart}. ${questions.length} questions were asked.${ctx.gapQuestions.length > 0 ? ` ${ctx.gapQuestions.length} question(s) need follow-up.` : ""}`;
  const summary = ctx.language === "ja" ? summaryJa : summaryEn;

  const joined = questions.join(" ");
  const useCase = /プロジェクト管理|project/i.test(joined)
    ? "プロジェクト管理"
    : /タスク|task/i.test(joined)
      ? "タスク管理"
      : null;
  const teamMatch = joined.match(/(\d+)\s*(名|人|people|members)/);
  const interest = Math.min(5, 2 + questions.length);
  return {
    summary,
    qualification: {
      useCase,
      teamSize: teamMatch ? `${teamMatch[1]}名` : null,
      timeline: /今月|今四半期|quarter|month/i.test(joined) ? "今四半期" : null,
      interest,
      summary: summaryJa,
    },
  };
}

export function fixtureInsights(ctx: InsightContext): InsightResult {
  // 「質問」のみをクラスタ対象にする(疑問符あり or 未回答ギャップに記録済み)
  const isQuestion = (text: string) =>
    /[??]/.test(text) || Boolean(ctx.gapIdByQuestion[normalizeQuestion(text)]);
  const clusters = new Map<string, { question: string; count: number }>();
  for (const q of ctx.buyerQuestions) {
    if (!isQuestion(q.text)) continue;
    const key = normalizeQuestion(q.text);
    if (!key) continue;
    const cur = clusters.get(key);
    if (cur) cur.count += 1;
    else clusters.set(key, { question: q.text, count: 1 });
  }
  const topQuestions = [...clusters.values()]
    .map((c) => {
      const answered = ctx.nodes.some((n) => matchesTitle(c.question, n.title));
      const gapId = ctx.gapIdByQuestion[normalizeQuestion(c.question)];
      return { question: c.question, count: c.count, answered, ...(gapId && !answered ? { gapId } : {}) };
    })
    // 件数降順、同数なら未回答を優先(トップ5に必ず残す)
    .sort((a, b) => b.count - a.count || Number(a.answered) - Number(b.answered))
    .slice(0, 5);

  const unanswered = topQuestions.filter((q) => !q.answered);
  const suggestions =
    unanswered.length > 0
      ? unanswered.map(
          (q) => `「${q.question}」への回答がBrainにありません。FAQの追加をおすすめします。`,
        )
      : ["未回答の頻出質問はありません。デモシナリオの改善を検討しましょう。"];
  return { topQuestions, suggestions };
}

export function fixtureDraftAnswer(question: string): { title: string; body: string } {
  return {
    title: question,
    body: "",
  };
}

export function fixtureTranslate(text: string, targetLang: string): string {
  const tag: Record<string, string> = { ja: "", en: "[EN] ", zh: "[ZH] ", es: "[ES] " };
  return `${tag[targetLang] ?? ""}${text}`;
}

// toneはfixtureでは文面に影響しない(liveモードのみ使用)
export function fixtureGreeting(productName: string): Record<string, string> {
  return fixtureBuildBrain(productName).greeting;
}
