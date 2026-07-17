import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { KnowledgeKind, Prisma } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const kind = req.nextUrl.searchParams.get("kind");
    const q = req.nextUrl.searchParams.get("q");
    const where: Prisma.KnowledgeNodeWhereInput = { aiEmployeeId: id };
    if (kind) where.kind = kind as KnowledgeKind;
    if (q) where.OR = [{ title: { contains: q } }, { body: { contains: q } }];
    const nodes = await prisma.knowledgeNode.findMany({
      where,
      include: { source: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ nodes });
  } catch (e) {
    return handleApiError(e);
  }
}

const Body = z.object({
  kind: z.enum(["FEATURE", "FAQ", "OBJECTION", "OTHER"]),
  title: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const body = Body.parse(await req.json());
    const node = await prisma.knowledgeNode.create({
      data: { aiEmployeeId: id, ...body, isEdited: true },
    });
    return NextResponse.json({ node });
  } catch (e) {
    return handleApiError(e);
  }
}
