import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({
  kind: z.enum(["FEATURE", "FAQ", "OBJECTION", "OTHER"]).optional(),
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const node = await prisma.knowledgeNode.findUnique({ where: { id } });
    if (!node) throw new HttpError(404, "not found");
    await requireEmployee(node.aiEmployeeId);
    const body = Body.parse(await req.json());
    const updated = await prisma.knowledgeNode.update({
      where: { id },
      data: { ...body, isEdited: true },
    });
    return NextResponse.json({ node: updated });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const node = await prisma.knowledgeNode.findUnique({ where: { id } });
    if (!node) throw new HttpError(404, "not found");
    await requireEmployee(node.aiEmployeeId);
    await prisma.knowledgeNode.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
