import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { updateTask } from "@/lib/services/taskService";

const updateSchema = z.object({
  status: z.enum(["OPEN", "DONE"]).optional(),
  title: z.string().min(1).optional(),
  dueAt: z.string().nullable().optional(),
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const parsed = updateSchema.parse(await req.json());
  const task = await updateTask(workspace.id, id, parsed);
  return NextResponse.json({ task });
});
