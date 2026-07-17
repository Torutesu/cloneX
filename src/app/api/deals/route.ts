import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { Errors, withErrorHandling } from "@/lib/api/errors";
import { getBoard, createDeal } from "@/lib/services/dealService";

const createSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().optional(),
  amount: z.number().int().optional(),
  companyId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const view = req.nextUrl.searchParams.get("view");
  if (view !== "board") {
    throw Errors.validation("view=board を指定してください");
  }
  const board = await getBoard(workspace.id);
  return NextResponse.json(board);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.parse(await req.json());
  const deal = await createDeal(workspace.id, parsed);
  return NextResponse.json({ deal });
});
