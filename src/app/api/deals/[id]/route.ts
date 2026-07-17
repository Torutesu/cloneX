import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { getDealById, updateDeal } from "@/lib/services/dealService";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  stageId: z.string().optional(),
  amount: z.number().int().nullable().optional(),
  nextActionAt: z.string().nullable().optional(),
});

export const GET = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const result = await getDealById(workspace.id, id);
  return NextResponse.json(result);
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const parsed = updateSchema.parse(await req.json());
  const deal = await updateDeal(workspace.id, id, parsed);
  return NextResponse.json({ deal });
});
