// Client-side view types mirroring the JSON shapes returned by src/app/api/**/route.ts.
// Loosely typed (not the Prisma models directly) since dates arrive as ISO strings
// over JSON and some fields are additive (see build-notes.md: emailBody, sourceEmail).

export type Stage = {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
};

export type Company = {
  id: string;
  name: string;
  domain: string | null;
  createdAt: string;
  contactCount?: number;
  dealCount?: number;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  companyId: string | null;
  createdAt: string;
  company?: Company | null;
  dealCount?: number;
};

export type DealContactLink = {
  dealId: string;
  contactId: string;
  role: string | null;
  contact: Contact;
};

export type Deal = {
  id: string;
  workspaceId: string;
  pipelineId: string;
  stageId: string;
  name: string;
  amount: number | null;
  currency: string;
  companyId: string | null;
  nextActionAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company | null;
  contacts?: DealContactLink[];
  stuck?: boolean;
};

export type BoardStage = { stage: Stage; deals: Deal[]; totalAmount: number; weightedAmount: number };
export type Board = { stages: BoardStage[] };

export type Activity = {
  id: string;
  workspaceId: string;
  dealId: string | null;
  type: "EMAIL" | "NOTE" | "TASK" | "SYSTEM" | "CHAT_ACTION";
  refId: string | null;
  summary: string;
  occurredAt: string;
  emailBody?: string | null;
};

export type Note = {
  id: string;
  workspaceId: string;
  dealId: string | null;
  body: string;
  createdAt: string;
};

export type Task = {
  id: string;
  workspaceId: string;
  dealId: string | null;
  title: string;
  dueAt: string | null;
  status: "OPEN" | "DONE";
  source: "USER" | "AI";
  createdAt: string;
  deal?: Deal | null;
};

export type ProposalType = "NEW_DEAL" | "NEW_CONTACT" | "FIELD_UPDATE" | "DRAFT_EMAIL" | "TASK";
export type ProposalStatus = "PENDING" | "APPROVED" | "REJECTED" | "AUTO_APPROVED";

export type NewDealPayload = {
  name: string;
  amount?: number;
  currency?: string;
  companyName: string;
  companyDomain?: string;
  contacts: { name: string; email: string; title?: string; role?: string }[];
  stageName: string;
  taskTitle?: string;
  reason: string;
};

export type NewContactPayload = {
  name: string;
  email: string;
  title?: string;
  companyName?: string;
  dealId?: string;
  reason: string;
};

export type FieldUpdatePayload = {
  dealId: string;
  field: "amount" | "stageId" | "nextActionAt" | "name";
  oldValue: string | null;
  newValue: string;
  reason: string;
};

export type DraftEmailPayload = {
  dealId?: string;
  contactId: string;
  subject: string;
  body: string;
  reason: string;
};

export type TaskPayload = {
  dealId?: string;
  title: string;
  dueAt?: string;
  reason: string;
};

export type AiProposal = {
  id: string;
  workspaceId: string;
  type: ProposalType;
  status: ProposalStatus;
  confidence: number;
  payload: unknown;
  sourceType: "EMAIL" | "CHAT";
  sourceId: string | null;
  dealId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  sourceEmail?: { fromEmail: string; fromName: string | null; bodyText: string } | null;
};

export type ChatMessage = {
  id: string;
  workspaceId: string;
  userId: string | null;
  role: "USER" | "ASSISTANT";
  content: string;
  toolCalls: { calls: unknown[]; error?: boolean } | null;
  createdAt: string;
};

export type AutoApprovePolicy = {
  id: string;
  workspaceId: string;
  proposalType: ProposalType;
  threshold: number;
  enabled: boolean;
};

export type ApiTokenRecord = {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};
