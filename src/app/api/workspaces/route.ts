import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthContext } from "@/lib/api/context";
import { Errors, withErrorHandling } from "@/lib/api/errors";
import { createWorkspaceForUser } from "@/lib/services/workspaceService";

const bodySchema = z.object({ name: z.string().min(1) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { user } = await requireAuthContext();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) throw Errors.validation("ワークスペース名を入力してください");

  const workspace = await createWorkspaceForUser(user.id, parsed.data.name);
  return NextResponse.json({ workspace });
});
