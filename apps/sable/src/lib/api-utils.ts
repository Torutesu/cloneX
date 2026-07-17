import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError, requireUser } from "./auth";
import { prisma } from "./db";
import { HttpError } from "./session-service";

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof AuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json({ error: e.issues.map((i) => i.message).join(", ") }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: "internal error" }, { status: 500 });
}

/** 認証+AI社員の所有チェック */
export async function requireEmployee(aiEmployeeId: string) {
  const user = await requireUser();
  const employee = await prisma.aiEmployee.findUnique({
    where: { id: aiEmployeeId },
    include: { persona: true },
  });
  if (!employee || employee.ownerId !== user.id) throw new HttpError(404, "not found");
  return { user, employee };
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8);
  return base ? `${base}-${suffix}` : `demo-${suffix}`;
}
