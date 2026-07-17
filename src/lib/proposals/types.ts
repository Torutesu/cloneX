import { z } from "zod";

export const newDealPayloadSchema = z.object({
  name: z.string().min(1),
  amount: z.number().int().optional(),
  currency: z.string().optional(),
  companyName: z.string().min(1),
  companyDomain: z.string().optional(),
  contacts: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      title: z.string().optional(),
      role: z.string().optional(),
    }),
  ),
  stageName: z.string().min(1),
  taskTitle: z.string().optional(),
  reason: z.string(),
});
export type NewDealPayload = z.infer<typeof newDealPayloadSchema>;

export const newContactPayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional(),
  companyName: z.string().optional(),
  dealId: z.string().optional(),
  reason: z.string(),
});
export type NewContactPayload = z.infer<typeof newContactPayloadSchema>;

export const fieldUpdatePayloadSchema = z.object({
  dealId: z.string(),
  field: z.enum(["amount", "stageId", "nextActionAt", "name"]),
  oldValue: z.string().nullable(),
  newValue: z.string(),
  reason: z.string(),
});
export type FieldUpdatePayload = z.infer<typeof fieldUpdatePayloadSchema>;

export const draftEmailPayloadSchema = z.object({
  dealId: z.string().optional(),
  contactId: z.string(),
  subject: z.string(),
  body: z.string(),
  reason: z.string(),
});
export type DraftEmailPayload = z.infer<typeof draftEmailPayloadSchema>;

export const taskPayloadSchema = z.object({
  dealId: z.string().optional(),
  title: z.string().min(1),
  dueAt: z.string().optional(),
  reason: z.string(),
});
export type TaskPayload = z.infer<typeof taskPayloadSchema>;

export const proposalPayloadSchemas = {
  NEW_DEAL: newDealPayloadSchema,
  NEW_CONTACT: newContactPayloadSchema,
  FIELD_UPDATE: fieldUpdatePayloadSchema,
  DRAFT_EMAIL: draftEmailPayloadSchema,
  TASK: taskPayloadSchema,
} as const;

export type ProposalTypeName = keyof typeof proposalPayloadSchemas;

/** AI structured-output shape returned by AIF-001 (both fixture and live mode). */
export const aiProposalDraftSchema = z.object({
  type: z.enum(["NEW_DEAL", "NEW_CONTACT", "FIELD_UPDATE", "DRAFT_EMAIL", "TASK"]),
  confidence: z.number().min(0).max(1),
  payload: z.record(z.string(), z.unknown()),
});
export type AiProposalDraft = z.infer<typeof aiProposalDraftSchema>;

export const aiEmailAnalysisResultSchema = z.object({
  proposals: z.array(aiProposalDraftSchema),
});
export type AiEmailAnalysisResult = z.infer<typeof aiEmailAnalysisResultSchema>;

export function validateProposalPayload(type: ProposalTypeName, payload: unknown) {
  const schema = proposalPayloadSchemas[type];
  return schema.parse(payload);
}
