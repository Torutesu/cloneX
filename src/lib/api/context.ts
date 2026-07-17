import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { Errors } from "@/lib/api/errors";
import type { User, Workspace } from "@prisma/client";

export type AuthContext = {
  user: User;
  workspace: Workspace | null;
};

/** Reads the session cookie and resolves the current user + their (single, MVP) workspace. Returns null if unauthenticated. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return null;

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });

  return { user, workspace: membership?.workspace ?? null };
}

/** Same as getAuthContext but throws a 401 ApiError when there is no session. */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw Errors.unauthorized();
  return ctx;
}

/** Same as requireAuthContext but also requires a workspace to exist (most endpoints past onboarding). */
export async function requireWorkspaceContext(): Promise<{ user: User; workspace: Workspace }> {
  const ctx = await requireAuthContext();
  if (!ctx.workspace) throw Errors.noWorkspace();
  return { user: ctx.user, workspace: ctx.workspace };
}
