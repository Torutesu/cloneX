import { prisma } from "@/lib/prisma";

const DEAL_BY_NAME_PREFIX = "$dealByName:";

/**
 * Fixture payloads can't hardcode real Deal ids (they're generated at seed time), so
 * fixture JSON uses a `$dealByName:<Deal.name>` sentinel wherever a real dealId is
 * needed (FIELD_UPDATE.dealId, TASK.dealId, NEW_CONTACT.dealId, ...). This resolves
 * those sentinels to actual ids right after a fixture match, before the payload is
 * validated/stored — live mode never produces sentinels, so this is a no-op there.
 */
export async function resolveFixtureSentinels(workspaceId: string, value: unknown): Promise<unknown> {
  if (typeof value === "string" && value.startsWith(DEAL_BY_NAME_PREFIX)) {
    const name = value.slice(DEAL_BY_NAME_PREFIX.length);
    const deal = await prisma.deal.findFirst({ where: { workspaceId, name } });
    return deal?.id ?? null;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => resolveFixtureSentinels(workspaceId, v)));
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(
        async ([k, v]) => [k, await resolveFixtureSentinels(workspaceId, v)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }
  return value;
}
