import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({ title: z.string().min(1), body: z.string().min(1) });

// ギャップ解消: FAQノードを作成し、ギャップをRESOLVEDにする
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const gap = await prisma.knowledgeGap.findUnique({ where: { id } });
    if (!gap) throw new HttpError(404, "not found");
    await requireEmployee(gap.aiEmployeeId);
    const body = Body.parse(await req.json());
    const result = await prisma.$transaction(async (tx) => {
      const node = await tx.knowledgeNode.create({
        data: {
          aiEmployeeId: gap.aiEmployeeId,
          kind: "FAQ",
          title: body.title,
          body: body.body,
          isEdited: true,
        },
      });
      const updated = await tx.knowledgeGap.update({
        where: { id },
        data: { status: "RESOLVED", resolvedNodeId: node.id },
      });
      return { gap: updated, node };
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
