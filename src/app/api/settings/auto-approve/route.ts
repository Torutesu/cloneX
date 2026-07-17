import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { getAutoApprovePolicies, putAutoApprovePolicies } from "@/lib/services/settingsService";

const putSchema = z.object({
  policies: z.array(
    z.object({
      proposalType: z.enum(["NEW_DEAL", "NEW_CONTACT", "FIELD_UPDATE", "DRAFT_EMAIL", "TASK"]),
      enabled: z.boolean(),
      threshold: z.number().min(0.5).max(1),
    }),
  ),
});

export const GET = withErrorHandling(async () => {
  const { workspace } = await requireWorkspaceContext();
  const policies = await getAutoApprovePolicies(workspace.id);
  return NextResponse.json({ policies });
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = putSchema.parse(await req.json());
  const policies = await putAutoApprovePolicies(workspace.id, parsed.policies);
  return NextResponse.json({ policies });
});
