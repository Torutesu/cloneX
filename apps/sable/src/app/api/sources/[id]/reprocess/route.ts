import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";
import { extractNodes } from "@/lib/ai/client";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) throw new HttpError(404, "not found");
    await requireEmployee(source.aiEmployeeId);
    await prisma.source.update({ where: { id }, data: { status: "PROCESSING" } });
    try {
      const nodes = await extractNodes(source.name, source.content ?? source.url ?? "");
      await prisma.$transaction(async (tx) => {
        for (const n of nodes) {
          await tx.knowledgeNode.create({
            data: { aiEmployeeId: source.aiEmployeeId, sourceId: source.id, ...n },
          });
        }
        await tx.source.update({ where: { id }, data: { status: "READY" } });
      });
      return NextResponse.json({ status: "READY", addedNodes: nodes.length }, { status: 202 });
    } catch {
      await prisma.source.update({ where: { id }, data: { status: "FAILED" } });
      return NextResponse.json({ status: "FAILED" }, { status: 202 });
    }
  } catch (e) {
    return handleApiError(e);
  }
}
