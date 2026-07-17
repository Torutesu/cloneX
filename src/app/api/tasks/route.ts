import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listTasks, createTask } from "@/lib/services/taskService";
import type { TaskStatus } from "@prisma/client";

const createSchema = z.object({
  title: z.string().min(1),
  dueAt: z.string().optional(),
  dealId: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const status = req.nextUrl.searchParams.get("status") as TaskStatus | null;
  const dueBefore = req.nextUrl.searchParams.get("dueBefore");
  const tasks = await listTasks(workspace.id, {
    status: status ?? undefined,
    dueBefore: dueBefore ? new Date(dueBefore) : undefined,
  });
  return NextResponse.json({ tasks });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.parse(await req.json());
  const task = await createTask(workspace.id, parsed);
  return NextResponse.json({ task });
});
