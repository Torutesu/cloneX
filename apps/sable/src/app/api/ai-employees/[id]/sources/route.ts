import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { extractNodes } from "@/lib/ai/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const sources = await prisma.source.findMany({
      where: { aiEmployeeId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ sources });
  } catch (e) {
    return handleApiError(e);
  }
}

const Body = z.object({
  type: z.enum(["PRODUCT_URL", "DOCUMENT", "CALL_RECORDING", "MARKETING"]),
  name: z.string().min(1),
  content: z.string().optional(),
  url: z.string().url().optional(),
});

// ソース追加 → AIF-001増分処理(ナレッジ抽出)を同一リクエストで実行
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const body = Body.parse(await req.json());
    const source = await prisma.source.create({
      data: { aiEmployeeId: id, ...body, status: "PROCESSING" },
    });
    try {
      const nodes = await extractNodes(body.name, body.content ?? body.url ?? "");
      await prisma.$transaction(async (tx) => {
        for (const n of nodes) {
          await tx.knowledgeNode.create({ data: { aiEmployeeId: id, sourceId: source.id, ...n } });
        }
        await tx.source.update({ where: { id: source.id }, data: { status: "READY" } });
      });
      const updated = await prisma.source.findUnique({ where: { id: source.id } });
      return NextResponse.json({ source: updated, addedNodes: nodes.length });
    } catch (e) {
      console.error("source processing failed", e);
      await prisma.source.update({ where: { id: source.id }, data: { status: "FAILED" } });
      const updated = await prisma.source.findUnique({ where: { id: source.id } });
      return NextResponse.json({ source: updated, addedNodes: 0 });
    }
  } catch (e) {
    return handleApiError(e);
  }
}
