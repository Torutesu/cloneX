import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { generateInsights } from "@/lib/ai/client";
import { normalizeQuestion } from "@/lib/ai/matching";
import { Prisma } from "@prisma/client";

async function computeStats(aiEmployeeId: string) {
  const sessions = await prisma.session.findMany({
    where: { aiEmployeeId, mode: "LIVE" },
    select: { id: true, startedAt: true, endedAt: true, status: true },
  });
  const ended = sessions.filter((s) => s.status === "ENDED" && s.endedAt);
  const avgDurationSec =
    ended.length > 0
      ? Math.round(
          ended.reduce((sum, s) => sum + (s.endedAt!.getTime() - s.startedAt.getTime()) / 1000, 0) /
            ended.length,
        )
      : 0;
  const questionCount = await prisma.transcriptTurn.count({
    where: { role: "BUYER", session: { aiEmployeeId, mode: "LIVE" } },
  });
  const openGapCount = await prisma.knowledgeGap.count({
    where: { aiEmployeeId, status: "OPEN" },
  });
  return { sessionCount: sessions.length, avgDurationSec, questionCount, openGapCount };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const report = await prisma.insightReport.findFirst({
      where: { aiEmployeeId: id },
      orderBy: { generatedAt: "desc" },
    });
    return NextResponse.json({ report, stats: await computeStats(id) });
  } catch (e) {
    return handleApiError(e);
  }
}

// AIF-006: インサイト再生成
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const buyerTurns = await prisma.transcriptTurn.findMany({
      where: { role: "BUYER", session: { aiEmployeeId: id, mode: "LIVE" } },
      select: { text: true, language: true },
    });
    const openGaps = await prisma.knowledgeGap.findMany({
      where: { aiEmployeeId: id, status: "OPEN" },
    });
    const nodes = await prisma.knowledgeNode.findMany({
      where: { aiEmployeeId: id },
      select: { id: true, title: true, body: true },
    });
    const gapIdByQuestion: Record<string, string> = {};
    for (const g of openGaps) gapIdByQuestion[normalizeQuestion(g.question)] = g.id;

    const result = await generateInsights({
      buyerQuestions: buyerTurns.map((t) => ({ text: t.text, language: t.language })),
      openGapQuestions: openGaps.map((g) => g.question),
      gapIdByQuestion,
      nodes,
    });
    const report = await prisma.insightReport.create({
      data: { aiEmployeeId: id, payload: result as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ report, stats: await computeStats(id) });
  } catch (e) {
    return handleApiError(e);
  }
}
