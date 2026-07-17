import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { getCompanyById, updateCompany } from "@/lib/services/companyService";

const updateSchema = z.object({ name: z.string().min(1).optional(), domain: z.string().nullable().optional() });

export const GET = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const result = await getCompanyById(workspace.id, id);
  return NextResponse.json(result);
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const parsed = updateSchema.parse(await req.json());
  const company = await updateCompany(workspace.id, id, parsed);
  return NextResponse.json({ company });
});
