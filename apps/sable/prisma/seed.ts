import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 冪等化: 既存のシード社員を削除してから作り直す(関連データはcascadeで消える)
  await prisma.aiEmployee.deleteMany({ where: { slug: "taskflow-demo" } });

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", passwordHash, name: "デモ ユーザー" },
  });

  const employee = await prisma.aiEmployee.create({
    data: {
      ownerId: user.id,
      name: "TaskFlowデモ担当",
      productName: "TaskFlow",
      productUrl: "http://localhost:3100/demo-target/dashboard",
      slug: "taskflow-demo",
      status: "PUBLISHED",
      brainStatus: "READY",
      persona: {
        create: {
          displayName: "Sana",
          avatarPreset: "CIRCLE_A",
          accentColor: "#6C5CE7",
          tone: "FRIENDLY",
          languages: ["ja", "en", "zh", "es"],
          greeting: {
            ja: "こんにちは!TaskFlowのご案内を担当するSanaです。デモを始めますか?それともご質問からにしますか?",
            en: "Hi! I'm Sana, your guide to TaskFlow. Shall we start the demo, or do you have questions first?",
            zh: "您好!我是Sana,负责为您介绍TaskFlow。我们开始演示,还是先回答您的问题?",
            es: "¡Hola! Soy Sana, tu guía de TaskFlow. ¿Empezamos la demo o prefieres hacer preguntas primero?",
          },
        },
      },
    },
  });

  const source = await prisma.source.create({
    data: {
      aiEmployeeId: employee.id,
      type: "PRODUCT_URL",
      name: "製品サイト",
      url: "http://localhost:3100/demo-target/dashboard",
      status: "READY",
    },
  });

  // KnowledgeNode 8件(FEATURE×4, FAQ×3, OBJECTION×1)
  const nodesData: {
    kind: "FEATURE" | "FAQ" | "OBJECTION";
    title: string;
    body: string;
  }[] = [
    {
      kind: "FEATURE",
      title: "ダッシュボード",
      body: "TaskFlowのダッシュボードは、進行中タスク・完了率・チームの稼働状況をKPIカードで一覧表示します。",
    },
    {
      kind: "FEATURE",
      title: "タスク管理(カンバンボード)",
      body: "タスクはカンバンボードでドラッグ&ドロップ管理できます。担当者・期限・ラベルを設定でき、列はワークフローに合わせてカスタマイズ可能です。",
    },
    {
      kind: "FEATURE",
      title: "レポート機能",
      body: "週次・月次のバーンダウンチャートとベロシティレポートを自動生成します。CSVエクスポートにも対応しています。",
    },
    {
      kind: "FEATURE",
      title: "通知とSlack連携",
      body: "タスクの更新はSlack・メールにリアルタイム通知されます。通知条件は細かく設定できます。",
    },
    {
      kind: "FAQ",
      title: "料金体系",
      body: "TaskFlowにはフリープランと、1ユーザーあたり月額$10のProプランがあります。年払いで20%割引になります。",
    },
    {
      kind: "FAQ",
      title: "無料トライアル",
      body: "Proプランは14日間の無料トライアルが利用できます。クレジットカード登録は不要です。",
    },
    {
      kind: "FAQ",
      title: "データのセキュリティ",
      body: "データは暗号化して保存され、毎日バックアップされます。通信はすべてTLSで保護されます。",
    },
    {
      kind: "OBJECTION",
      title: "他のタスク管理ツールとの違い",
      body: "TaskFlowはレポート自動生成とSlack連携の深さが強みです。移行ツールで既存データを10分でインポートできます。",
    },
  ];
  for (const n of nodesData) {
    await prisma.knowledgeNode.create({
      data: { aiEmployeeId: employee.id, sourceId: source.id, ...n },
    });
  }

  // デモシナリオ(4ステップ、4言語ナレーション)
  const scenario = await prisma.demoScenario.create({
    data: {
      aiEmployeeId: employee.id,
      title: "基本デモ",
      isDefault: true,
    },
  });
  const steps = [
    {
      order: 1,
      title: "ダッシュボード概要",
      route: "/demo-target/dashboard",
      selector: ".kpi-cards",
      narration: {
        ja: "まずはダッシュボードです。進行中のタスクとチームの状況が、このKPIカードでひと目で分かります。",
        en: "This is the dashboard. These KPI cards give you an at-a-glance view of active tasks and team workload.",
        zh: "首先是仪表盘。通过这些KPI卡片,您可以一目了然地看到进行中的任务和团队状况。",
        es: "Este es el panel de control. Estas tarjetas KPI te muestran de un vistazo las tareas activas y la carga del equipo.",
      },
    },
    {
      order: 2,
      title: "カンバンボード",
      route: "/demo-target/board",
      selector: ".board-columns",
      narration: {
        ja: "次にカンバンボードです。タスクをドラッグ&ドロップで動かして、ワークフローを直感的に管理できます。",
        en: "Next is the kanban board. You can drag and drop tasks to manage your workflow intuitively.",
        zh: "接下来是看板。您可以通过拖放任务,直观地管理工作流程。",
        es: "Ahora el tablero kanban. Puedes arrastrar y soltar tareas para gestionar tu flujo de trabajo de forma intuitiva.",
      },
    },
    {
      order: 3,
      title: "レポート",
      route: "/demo-target/reports",
      selector: ".report-chart",
      narration: {
        ja: "こちらがレポート画面です。バーンダウンチャートとベロシティが自動生成され、CSVでも出力できます。",
        en: "Here are the reports. Burndown charts and velocity are generated automatically, with CSV export.",
        zh: "这是报表页面。燃尽图和速度报告会自动生成,还支持CSV导出。",
        es: "Aquí están los informes. Los gráficos burndown y la velocidad se generan automáticamente, con exportación a CSV.",
      },
    },
    {
      order: 4,
      title: "設定と連携",
      route: "/demo-target/settings",
      selector: ".settings-form",
      narration: {
        ja: "最後に設定画面です。Slack連携や通知条件をここからカスタマイズできます。以上が基本デモです!",
        en: "Finally, settings. You can configure Slack integration and notifications here. That wraps up the demo!",
        zh: "最后是设置页面。您可以在这里配置Slack集成和通知条件。演示到此结束!",
        es: "Por último, la configuración. Aquí puedes configurar la integración con Slack y las notificaciones. ¡Con esto termina la demo!",
      },
    },
  ];
  for (const s of steps) {
    await prisma.demoStep.create({ data: { scenarioId: scenario.id, ...s } });
  }

  // ===== シードセッションA: 田中/ACME、ja→en切替、資格確認、SSOギャップ =====
  const base = new Date("2026-07-16T10:00:00+09:00");
  const t = (min: number) => new Date(base.getTime() + min * 60_000);

  const sessionA = await prisma.session.create({
    data: {
      aiEmployeeId: employee.id,
      scenarioId: scenario.id,
      mode: "LIVE",
      buyerName: "田中",
      buyerCompany: "ACME",
      language: "en",
      status: "ENDED",
      currentStepOrder: 2,
      summary:
        "田中様(ACME)にダッシュボードとカンバンボードをご案内しました。料金と導入時期についてご質問があり、SSO対応は持ち帰りとなりました。",
      startedAt: t(0),
      endedAt: t(12),
    },
  });
  const turnsA = [
    { role: "AI", text: "こんにちは!TaskFlowのご案内を担当するSanaです。", language: "ja", stepOrder: 0, min: 0 },
    { role: "BUYER", text: "プロジェクト管理に使えるか見たいです。チームは20名です。", language: "ja", stepOrder: 0, min: 1 },
    { role: "AI", text: "ありがとうございます。まずはダッシュボードからご覧ください。", language: "ja", stepOrder: 1, min: 2 },
    { role: "BUYER", text: "料金を教えてください。", language: "ja", stepOrder: 1, min: 4 },
    { role: "AI", text: "フリープランと、1ユーザーあたり月額$10のProプランがあります。", language: "ja", stepOrder: 1, min: 4 },
    { role: "BUYER", text: "How much does the Pro plan cost annually?", language: "en", stepOrder: 2, min: 6 },
    { role: "AI", text: "With annual billing you get a 20% discount, so it comes to $96 per user per year.", language: "en", stepOrder: 2, min: 6 },
    { role: "BUYER", text: "SSOには対応していますか?", language: "ja", stepOrder: 2, min: 8 },
    { role: "AI", text: "申し訳ありません、確認して追ってご連絡します。", language: "ja", stepOrder: 2, min: 8 },
  ] as const;
  for (const turn of turnsA) {
    await prisma.transcriptTurn.create({
      data: {
        sessionId: sessionA.id,
        role: turn.role,
        text: turn.text,
        language: turn.language,
        stepOrder: turn.stepOrder,
        createdAt: t(turn.min),
      },
    });
  }
  const gapSSO = await prisma.knowledgeGap.create({
    data: {
      aiEmployeeId: employee.id,
      question: "SSOには対応していますか?",
      language: "ja",
      sessionId: sessionA.id,
      status: "OPEN",
      createdAt: t(8),
    },
  });
  const eventsA = [
    { type: "SESSION_START", payload: { language: "ja" }, min: 0 },
    { type: "STEP_SHOWN", payload: { order: 1, title: "ダッシュボード概要" }, min: 2 },
    { type: "STEP_SHOWN", payload: { order: 2, title: "カンバンボード" }, min: 5 },
    { type: "LANGUAGE_SWITCH", payload: { from: "ja", to: "en" }, min: 6 },
    { type: "GAP_RECORDED", payload: { gapId: gapSSO.id, question: "SSOには対応していますか?" }, min: 8 },
    { type: "SESSION_END", payload: {}, min: 12 },
  ] as const;
  for (const ev of eventsA) {
    await prisma.sessionEvent.create({
      data: { sessionId: sessionA.id, type: ev.type, payload: ev.payload, createdAt: t(ev.min) },
    });
  }
  await prisma.qualification.create({
    data: {
      sessionId: sessionA.id,
      useCase: "プロジェクト管理",
      teamSize: "20名",
      timeline: "今四半期",
      interest: 4,
      summary: "20名チームでのプロジェクト管理用途。料金への関心が高く、SSO対応が導入条件の可能性。",
    },
  });

  // ===== シードセッションB: 鈴木/GammaTech、ja、オンプレギャップ(未回答クラスタ用) =====
  const baseB = new Date("2026-07-16T15:00:00+09:00");
  const tb = (min: number) => new Date(baseB.getTime() + min * 60_000);
  const sessionB = await prisma.session.create({
    data: {
      aiEmployeeId: employee.id,
      scenarioId: scenario.id,
      mode: "LIVE",
      buyerName: "鈴木",
      buyerCompany: "GammaTech",
      language: "ja",
      status: "ENDED",
      currentStepOrder: 1,
      summary: "鈴木様(GammaTech)にダッシュボードをご案内しました。オンプレミス対応が未回答です。",
      startedAt: tb(0),
      endedAt: tb(8),
    },
  });
  const turnsB = [
    { role: "AI", text: "こんにちは!TaskFlowのご案内を担当するSanaです。", language: "ja", stepOrder: 0, min: 0 },
    { role: "BUYER", text: "料金を教えてください。", language: "ja", stepOrder: 0, min: 2 },
    { role: "AI", text: "フリープランと、1ユーザーあたり月額$10のProプランがあります。", language: "ja", stepOrder: 0, min: 2 },
    { role: "BUYER", text: "オンプレミス対応はありますか?", language: "ja", stepOrder: 1, min: 5 },
    { role: "AI", text: "申し訳ありません、確認して追ってご連絡します。", language: "ja", stepOrder: 1, min: 5 },
  ] as const;
  for (const turn of turnsB) {
    await prisma.transcriptTurn.create({
      data: {
        sessionId: sessionB.id,
        role: turn.role,
        text: turn.text,
        language: turn.language,
        stepOrder: turn.stepOrder,
        createdAt: tb(turn.min),
      },
    });
  }
  const gapOnPrem = await prisma.knowledgeGap.create({
    data: {
      aiEmployeeId: employee.id,
      question: "オンプレミス対応はありますか?",
      language: "ja",
      sessionId: sessionB.id,
      status: "OPEN",
      createdAt: tb(5),
    },
  });
  const eventsB = [
    { type: "SESSION_START", payload: { language: "ja" }, min: 0 },
    { type: "STEP_SHOWN", payload: { order: 1, title: "ダッシュボード概要" }, min: 3 },
    { type: "GAP_RECORDED", payload: { gapId: gapOnPrem.id, question: "オンプレミス対応はありますか?" }, min: 5 },
    { type: "SESSION_END", payload: {}, min: 8 },
  ] as const;
  for (const ev of eventsB) {
    await prisma.sessionEvent.create({
      data: { sessionId: sessionB.id, type: ev.type, payload: ev.payload, createdAt: tb(ev.min) },
    });
  }
  await prisma.qualification.create({
    data: {
      sessionId: sessionB.id,
      useCase: "社内タスク管理",
      teamSize: null,
      timeline: null,
      interest: 3,
      summary: "オンプレミス要件がある可能性。要フォローアップ。",
    },
  });

  console.log("Seed complete:", { user: user.email, employee: employee.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
