// fixtureモードの決定的マッチング基盤(liveモードでも言語判定フォールバックに使用)
// マッチングは対象の「タイトル」に対して行う(本文マッチは汎用語での誤ヒットが多いため)

// 汎用的すぎてトピック判別に使えない語
const STOPWORDS = new Set([
  "対応",
  "機能",
  "管理",
  "教え",
  "確認",
  "質問",
  "利用",
  "可能",
  "方法",
  "について",
  "the",
  "and",
  "you",
  "can",
  "does",
  "have",
  "what",
  "how",
]);

/** 質問からマッチング用トークンを抽出: ASCII語(3+)と漢字/カタカナ連続(2+)+漢字ビグラム */
export function extractTokens(text: string): string[] {
  const lower = text.toLowerCase();
  const ascii = lower.match(/[a-z0-9]{3,}/g) ?? [];
  const kanjiRuns = text.match(/[一-鿿]{2,}/g) ?? [];
  const kataRuns = text.match(/[ァ-ヶー]{2,}/g) ?? [];
  const bigrams: string[] = [];
  for (const run of kanjiRuns) {
    for (let i = 0; i + 2 <= run.length; i++) bigrams.push(run.slice(i, i + 2));
  }
  return [...new Set([...ascii, ...kanjiRuns, ...kataRuns, ...bigrams])].filter(
    (t) => !STOPWORDS.has(t),
  );
}

// 言語横断の話題シノニム(fixture用)。probesは対象タイトル側に現れる語
const TOPIC_SYNONYMS: { triggers: RegExp; probes: string[] }[] = [
  {
    triggers: /price|pricing|cost|how much|价格|费用|多少钱|precio|cuánto|cuesta|tarifa|料金|価格|値段/i,
    probes: ["料金", "pricing", "price", "プラン"],
  },
  {
    triggers: /report|analytics|报表|报告|informe|reporte|レポート|分析/i,
    probes: ["レポート", "report"],
  },
  {
    triggers: /task|kanban|board|任务|看板|tarea|tablero|タスク|カンバン/i,
    probes: ["タスク", "カンバン", "task", "kanban"],
  },
  {
    triggers: /slack|notification|integration|通知|集成|integración|notificación|連携/i,
    probes: ["通知", "連携", "slack"],
  },
  {
    triggers: /dashboard|仪表盘|panel|ダッシュボード/i,
    probes: ["ダッシュボード", "dashboard"],
  },
];

export function topicProbes(question: string): string[] {
  const probes: string[] = [];
  for (const topic of TOPIC_SYNONYMS) {
    if (topic.triggers.test(question)) probes.push(...topic.probes);
  }
  return probes;
}

/** 対象タイトルが質問にマッチするか(話題プローブ包含 or トークン包含) */
export function matchesTitle(question: string, title: string): boolean {
  const target = title.toLowerCase();
  for (const probe of topicProbes(question)) {
    if (target.includes(probe.toLowerCase())) return true;
  }
  for (const token of extractTokens(question)) {
    if (target.includes(token.toLowerCase())) return true;
  }
  return false;
}

/** 言語判定ヒューリスティック(fixture)。対応言語外・判定不能はnull */
export function detectLanguage(text: string, allowed: string[]): string | null {
  let detected: string;
  if (/[ぁ-んァ-ヶー]/.test(text)) detected = "ja";
  else if (/[一-鿿]/.test(text)) detected = "zh";
  else if (/[¿¡]|[áéíóúñ]|\b(hola|precio|cuánto|cuesta|gracias|puede|cómo)\b/i.test(text)) detected = "es";
  else if (/[a-z]/i.test(text)) detected = "en";
  else return null;
  return allowed.includes(detected) ? detected : null;
}

/** 質問文の正規化キー(インサイトのクラスタリング用) */
export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[??!!。、.,\s]/g, "")
    .trim();
}
