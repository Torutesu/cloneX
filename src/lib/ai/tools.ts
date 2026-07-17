import { z } from "zod";
import * as dealService from "@/lib/services/dealService";
import * as contactService from "@/lib/services/contactService";
import * as companyService from "@/lib/services/companyService";
import * as taskService from "@/lib/services/taskService";
import * as proposalService from "@/lib/services/proposalService";
import * as activityService from "@/lib/services/activityService";
import { Errors } from "@/lib/api/errors";

/**
 * Thin, workspace-scoped wrappers around the service layer (src/lib/services/*),
 * shared by three call sites per 03-api.md "MCPファースト":
 *   - AIF-002 chat tool-use loop (fixture: src/lib/ai/chat.ts; live: Anthropic tool-use)
 *   - /api/mcp (Streamable HTTP MCP server)
 * Each tool's Zod schema is the single source of truth for both MCP's
 * `inputSchema` (registerTool accepts a zod raw shape directly) and the JSON
 * Schema handed to the Anthropic Messages API tool-use loop (via toJsonSchema
 * below — a small hand-rolled converter covering the flat object shapes used
 * here, so we don't need an extra zod-to-json-schema dependency).
 */

export const dealsSearchSchema = z.object({
  query: z.string().optional().describe("ディール名の部分一致検索"),
  stageName: z.string().optional().describe("ステージ名(完全一致、大文字小文字区別なし)"),
  stuckOnly: z
    .boolean()
    .optional()
    .describe("true の場合、10日以上更新されておらず未クローズ(Won/Lost以外)のディールのみ返す"),
});

export const dealsCreateSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().optional().describe("省略時はパイプライン先頭ステージ"),
  amount: z.number().optional(),
  companyId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
});

export const dealsUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  stageId: z.string().optional(),
  amount: z.number().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
});

export const contactsSearchSchema = z.object({
  q: z.string().optional().describe("名前・メールの部分一致検索"),
});

export const contactsCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
});

export const companiesSearchSchema = z.object({
  q: z.string().optional().describe("企業名の部分一致検索"),
});

export const tasksListSchema = z.object({
  status: z.enum(["OPEN", "DONE"]).optional(),
  dueBefore: z.string().optional().describe("ISO日時。指定時この日時以前が期限のタスクのみ返す"),
});

export const tasksCreateSchema = z.object({
  title: z.string().min(1),
  dueAt: z.string().optional(),
  dealId: z.string().optional(),
});

export const tasksCompleteSchema = z.object({
  id: z.string(),
});

export const proposalsListSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "AUTO_APPROVED"]).optional(),
  type: z.enum(["NEW_DEAL", "NEW_CONTACT", "FIELD_UPDATE", "DRAFT_EMAIL", "TASK"]).optional(),
});

export const proposalsApproveSchema = z.object({
  id: z.string(),
});

export const proposalsRejectSchema = z.object({
  id: z.string(),
});

export const activitiesListSchema = z.object({
  dealId: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export const TOOL_NAMES = [
  "deals_search",
  "deals_create",
  "deals_update",
  "contacts_search",
  "contacts_create",
  "companies_search",
  "tasks_list",
  "tasks_create",
  "tasks_complete",
  "proposals_list",
  "proposals_approve",
  "proposals_reject",
  "activities_list",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const toolDefs: Record<ToolName, { description: string; schema: z.ZodObject<z.ZodRawShape> }> = {
  deals_search: { description: "名前/ステージ/停滞日数でディールを検索する", schema: dealsSearchSchema },
  deals_create: { description: "ディールを作成する", schema: dealsCreateSchema },
  deals_update: { description: "ディールを更新する(ステージ・金額・名前・次アクション日)", schema: dealsUpdateSchema },
  contacts_search: { description: "コンタクトを名前/メールで検索する", schema: contactsSearchSchema },
  contacts_create: { description: "コンタクトを作成する", schema: contactsCreateSchema },
  companies_search: { description: "企業を名前で検索する", schema: companiesSearchSchema },
  tasks_list: { description: "タスク一覧を取得する", schema: tasksListSchema },
  tasks_create: { description: "タスクを作成する", schema: tasksCreateSchema },
  tasks_complete: { description: "タスクを完了(DONE)にする", schema: tasksCompleteSchema },
  proposals_list: { description: "承認キューの提案一覧を取得する", schema: proposalsListSchema },
  proposals_approve: { description: "提案を承認し実体化する", schema: proposalsApproveSchema },
  proposals_reject: { description: "提案を却下する", schema: proposalsRejectSchema },
  activities_list: { description: "タイムライン(活動履歴)を取得する", schema: activitiesListSchema },
};

/** Executes one MCP/chat tool against the real service layer, scoped to workspaceId. */
export async function executeTool(workspaceId: string, name: string, rawArgs: unknown): Promise<unknown> {
  const def = toolDefs[name as ToolName];
  if (!def) throw Errors.validation(`未知のツール: ${name}`);
  const args = def.schema.parse(rawArgs ?? {});

  switch (name as ToolName) {
    case "deals_search": {
      const a = args as z.infer<typeof dealsSearchSchema>;
      return dealService.searchDeals(workspaceId, a);
    }
    case "deals_create": {
      const a = args as z.infer<typeof dealsCreateSchema>;
      return dealService.createDeal(workspaceId, a);
    }
    case "deals_update": {
      const a = args as z.infer<typeof dealsUpdateSchema>;
      const { id, ...rest } = a;
      return dealService.updateDeal(workspaceId, id, rest);
    }
    case "contacts_search": {
      const a = args as z.infer<typeof contactsSearchSchema>;
      return contactService.listContacts(workspaceId, a.q);
    }
    case "contacts_create": {
      const a = args as z.infer<typeof contactsCreateSchema>;
      return contactService.createContact(workspaceId, a);
    }
    case "companies_search": {
      const a = args as z.infer<typeof companiesSearchSchema>;
      return companyService.listCompanies(workspaceId, a.q);
    }
    case "tasks_list": {
      const a = args as z.infer<typeof tasksListSchema>;
      return taskService.listTasks(workspaceId, {
        status: a.status,
        dueBefore: a.dueBefore ? new Date(a.dueBefore) : undefined,
      });
    }
    case "tasks_create": {
      const a = args as z.infer<typeof tasksCreateSchema>;
      return taskService.createTask(workspaceId, a);
    }
    case "tasks_complete": {
      const a = args as z.infer<typeof tasksCompleteSchema>;
      return taskService.updateTask(workspaceId, a.id, { status: "DONE" });
    }
    case "proposals_list": {
      const a = args as z.infer<typeof proposalsListSchema>;
      return proposalService.listProposals(workspaceId, a);
    }
    case "proposals_approve": {
      const a = args as z.infer<typeof proposalsApproveSchema>;
      // No session user in MCP/chat-tool context (Bearer ApiToken auth only) —
      // resolvedById is nullable on AiProposal for exactly this case.
      return proposalService.approveProposal(workspaceId, a.id, null);
    }
    case "proposals_reject": {
      const a = args as z.infer<typeof proposalsRejectSchema>;
      return proposalService.rejectProposal(workspaceId, a.id, null);
    }
    case "activities_list": {
      const a = args as z.infer<typeof activitiesListSchema>;
      return activityService.listActivities(workspaceId, a);
    }
  }
}

type JsonSchema = { type: string; properties?: Record<string, unknown>; required?: string[]; enum?: unknown[]; items?: JsonSchema };

function fieldToJsonSchema(field: z.ZodTypeAny): JsonSchema {
  let inner: z.ZodTypeAny = field;
  while (inner instanceof z.ZodOptional || inner instanceof z.ZodNullable) {
    inner = inner instanceof z.ZodOptional ? inner.unwrap() : inner.unwrap();
  }
  if (inner instanceof z.ZodString) return { type: "string" };
  if (inner instanceof z.ZodNumber) return { type: "number" };
  if (inner instanceof z.ZodBoolean) return { type: "boolean" };
  if (inner instanceof z.ZodEnum) return { type: "string", enum: inner.options };
  if (inner instanceof z.ZodArray) return { type: "array", items: fieldToJsonSchema(inner.element) };
  return { type: "string" };
}

/** Minimal zod-object -> JSON Schema converter for the Anthropic Messages API tool-use `input_schema` (flat shapes only — sufficient for every tool above). */
export function toJsonSchema(schema: z.ZodObject<z.ZodRawShape>): { type: "object"; properties: Record<string, unknown>; required?: string[] } {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    properties[key] = fieldToJsonSchema(value as z.ZodTypeAny);
    if (!(value instanceof z.ZodOptional) && !(value instanceof z.ZodNullable)) required.push(key);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}
