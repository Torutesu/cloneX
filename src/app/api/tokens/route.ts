import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listTokens, createToken } from "@/lib/services/tokenService";

const createSchema = z.object({ name: z.string().min(1) });

export const GET = withErrorHandling(async () => {
  const { workspace } = await requireWorkspaceContext();
  const tokens = await listTokens(workspace.id);
  return NextResponse.json({ tokens });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.parse(await req.json());
  const { token, record } = await createToken(workspace.id, parsed.name);
  return NextResponse.json({ token, record });
});
