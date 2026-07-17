import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { ingestEmail } from "@/lib/services/emailIngestService";

const bodySchema = z.object({
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
  subject: z.string().min(1),
  bodyText: z.string().min(1),
  sentAt: z.string().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = bodySchema.parse(await req.json());
  const result = await ingestEmail(workspace.id, parsed);
  return NextResponse.json({ messageId: result.messageId, proposals: result.proposals, failed: result.failed });
});
