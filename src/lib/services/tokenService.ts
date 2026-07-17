import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import type { ApiToken } from "@prisma/client";

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function omitTokenHash(token: ApiToken): Omit<ApiToken, "tokenHash"> {
  const { tokenHash, ...rest } = token;
  void tokenHash;
  return rest;
}

export async function listTokens(workspaceId: string) {
  const tokens = await prisma.apiToken.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  return tokens.map(omitTokenHash);
}

export async function createToken(workspaceId: string, name: string) {
  const raw = `clonex_${randomBytes(24).toString("hex")}`;
  const record = await prisma.apiToken.create({
    data: { workspaceId, name, tokenHash: hashToken(raw) },
  });
  return { token: raw, record: omitTokenHash(record) };
}

export async function deleteToken(workspaceId: string, id: string) {
  const existing = await prisma.apiToken.findFirst({ where: { id, workspaceId } });
  if (!existing) throw Errors.notFound("トークン");
  await prisma.apiToken.delete({ where: { id } });
}

/** Resolves an ApiToken (and its workspace) from a bearer plaintext token, for /api/mcp auth. */
export async function resolveWorkspaceByToken(plainToken: string) {
  const tokenHash = hashToken(plainToken);
  const token = await prisma.apiToken.findUnique({ where: { tokenHash }, include: { workspace: true } });
  if (!token) return null;
  await prisma.apiToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
  return token.workspace;
}
