import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { createNote } from "@/lib/services/noteService";

const bodySchema = z.object({ dealId: z.string(), body: z.string().min(1) });

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = bodySchema.parse(await req.json());
  const note = await createNote(workspace.id, parsed);
  return NextResponse.json({ note });
});
