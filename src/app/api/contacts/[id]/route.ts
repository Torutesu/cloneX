import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { getContactById, updateContact } from "@/lib/services/contactService";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  title: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export const GET = withErrorHandling(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const result = await getContactById(workspace.id, id);
  return NextResponse.json(result);
});

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { workspace } = await requireWorkspaceContext();
  const { id } = await ctx.params;
  const parsed = updateSchema.parse(await req.json());
  const contact = await updateContact(workspace.id, id, parsed);
  return NextResponse.json({ contact });
});
