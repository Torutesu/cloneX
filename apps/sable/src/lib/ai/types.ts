export type ChatContext = {
  question: string;
  language: string; // 現在のセッション言語(切替後)
  personaName: string;
  tone: string;
  productName: string;
  nodes: { id: string; kind: string; title: string; body: string }[];
  steps: { order: number; title: string }[];
  currentStepOrder: number;
  history: { role: "BUYER" | "AI"; text: string }[];
};

export type ChatResult = {
  answer: string;
  referencedNodeIds: string[];
  confident: boolean;
  jumpToStepOrder?: number;
};

export type BrainBuildResult = {
  nodes: { kind: "FEATURE" | "FAQ" | "OBJECTION" | "OTHER"; title: string; body: string }[];
  steps: {
    order: number;
    title: string;
    route: string;
    selector: string | null;
    narration: Record<string, string>;
  }[];
  greeting: Record<string, string>;
};

export type SummaryContext = {
  buyerName: string | null;
  buyerCompany: string | null;
  language: string;
  productName: string;
  turns: { role: "BUYER" | "AI"; text: string; language: string }[];
  shownStepTitles: string[];
  gapQuestions: string[];
};

export type SummaryResult = {
  summary: string;
  qualification: {
    useCase: string | null;
    teamSize: string | null;
    timeline: string | null;
    interest: number | null;
    summary: string;
  };
};

export type InsightContext = {
  buyerQuestions: { text: string; language: string }[];
  openGapQuestions: string[];
  gapIdByQuestion: Record<string, string>;
  nodes: { id: string; title: string; body: string }[];
};

export type InsightResult = {
  topQuestions: { question: string; count: number; answered: boolean; gapId?: string }[];
  suggestions: string[];
};
