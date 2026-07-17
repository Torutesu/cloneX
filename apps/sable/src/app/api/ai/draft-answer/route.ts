import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";
import { draftAnswer } from "@/lib/ai/client";

const Body = z.object({ gapId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { gapId } = Body.parse(await req.json());
    const gap = await prisma.knowledgeGap.findUnique({ where: { id: gapId } });
    if (!gap) throw new HttpError(404, "not found");
    await requireEmployee(gap.aiEmployeeId);
    const nodes = await prisma.knowledgeNode.findMany({
      where: { aiEmployeeId: gap.aiEmployeeId },
      select: { title: true, body: true },
    });
    const draft = await draftAnswer(gap.question, nodes);
    return NextResponse.json(draft);
  } catch (e) {
    return handleApiError(e);
  }
}
