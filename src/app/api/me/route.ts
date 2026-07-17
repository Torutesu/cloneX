import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";

// auth: authenticated (03-api.md) — used by every /app screen as the session guard,
// so an unauthenticated caller gets a real 401 rather than a soft {user: null}.
export const GET = withErrorHandling(async () => {
  const ctx = await requireAuthContext();
  return NextResponse.json({
    user: { id: ctx.user.id, email: ctx.user.email, name: ctx.user.name },
    workspace: ctx.workspace ? { id: ctx.workspace.id, name: ctx.workspace.name } : null,
  });
});
