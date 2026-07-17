// 買い手向けUI(SCR-001/002/003)の4言語文言。管理UIは日本語固定
export type Lang = "ja" | "en" | "zh" | "es";

export const SUPPORTED_LANGS: Lang[] = ["ja", "en", "zh", "es"];

export const LANG_NAMES: Record<Lang, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  es: "Español",
};

type Dict = Record<string, Record<Lang, string>>;

export const T: Dict = {
  welcomeTitle: {
    ja: "のデモへようこそ",
    en: " — Welcome to the demo",
    zh: "演示欢迎页",
    es: " — Bienvenido a la demo",
  },
  guideIntro: {
    ja: "が製品をご案内します",
    en: " will guide you through the product",
    zh: "将为您介绍产品",
    es: " te guiará por el producto",
  },
  yourName: { ja: "お名前(任意)", en: "Your name (optional)", zh: "姓名(可选)", es: "Tu nombre (opcional)" },
  company: { ja: "会社名(任意)", en: "Company (optional)", zh: "公司(可选)", es: "Empresa (opcional)" },
  language: { ja: "言語", en: "Language", zh: "语言", es: "Idioma" },
  startDemo: { ja: "▶ デモをはじめる", en: "▶ Start the demo", zh: "▶ 开始演示", es: "▶ Iniciar la demo" },
  unavailable: {
    ja: "このデモは現在利用できません",
    en: "This demo is currently unavailable",
    zh: "该演示当前不可用",
    es: "Esta demo no está disponible actualmente",
  },
  send: { ja: "送信", en: "Send", zh: "发送", es: "Enviar" },
  inputPlaceholder: {
    ja: "メッセージを入力...",
    en: "Type a message...",
    zh: "输入消息...",
    es: "Escribe un mensaje...",
  },
  endSession: { ja: "終了", en: "End", zh: "结束", es: "Finalizar" },
  confirmEnd: {
    ja: "セッションを終了しますか?",
    en: "End this session?",
    zh: "要结束会话吗?",
    es: "¿Finalizar esta sesión?",
  },
  confirmEndYes: { ja: "終了する", en: "End session", zh: "结束", es: "Finalizar" },
  cancel: { ja: "キャンセル", en: "Cancel", zh: "取消", es: "Cancelar" },
  prevStep: { ja: "◀ 前へ", en: "◀ Back", zh: "◀ 上一步", es: "◀ Atrás" },
  nextStep: { ja: "次へ ▶", en: "Next ▶", zh: "下一步 ▶", es: "Siguiente ▶" },
  step: { ja: "ステップ", en: "Step", zh: "步骤", es: "Paso" },
  speaking: { ja: "話し中", en: "Speaking", zh: "发言中", es: "Hablando" },
  thanks: {
    ja: "ご参加ありがとうございました!",
    en: "Thank you for joining!",
    zh: "感谢您的参与!",
    es: "¡Gracias por participar!",
  },
  summaryTitle: { ja: "本日のまとめ", en: "Session summary", zh: "本次总结", es: "Resumen de la sesión" },
  nextSteps: { ja: "次のステップ", en: "Next steps", zh: "后续步骤", es: "Próximos pasos" },
  viewProduct: { ja: "製品サイトを見る", en: "Visit the product site", zh: "访问产品网站", es: "Ver el sitio del producto" },
  viewTranscript: {
    ja: "トランスクリプトを見る",
    en: "View transcript",
    zh: "查看对话记录",
    es: "Ver la transcripción",
  },
  switchedTo: { ja: "に切替", en: "switched", zh: "已切换", es: "cambiado" },
  refs: { ja: "件参照", en: " sources", zh: "条参考", es: " fuentes" },
  rehearsalBanner: {
    ja: "リハーサルモード(記録はインサイトに含まれません)",
    en: "Rehearsal mode (not included in insights)",
    zh: "排练模式(不计入分析)",
    es: "Modo ensayo (no se incluye en los análisis)",
  },
  preparing: { ja: "準備中…", en: "Preparing…", zh: "准备中…", es: "Preparando…" },
  generatingSummary: {
    ja: "まとめを作成しています…",
    en: "Generating your summary…",
    zh: "正在生成总结…",
    es: "Generando el resumen…",
  },
  aiError: {
    ja: "応答を生成できませんでした",
    en: "Could not generate a response",
    zh: "无法生成回复",
    es: "No se pudo generar una respuesta",
  },
  retry: { ja: "再試行", en: "Retry", zh: "重试", es: "Reintentar" },
};

export function t(key: keyof typeof T, lang: string): string {
  const entry = T[key]!;
  return entry[(lang as Lang) in entry ? (lang as Lang) : "ja"] ?? "";
}
