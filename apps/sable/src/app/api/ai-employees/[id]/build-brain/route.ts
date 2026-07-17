import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { buildBrain } from "@/lib/ai/client";

// AIF-001: Brainゼロタッチ構築。fixtureでは即時、liveでは同一リクエスト内で同期実行
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { employee } = await requireEmployee(id);
    await prisma.aiEmployee.update({ where: { id }, data: { brainStatus: "BUILDING" } });

    try {
      const sources = await prisma.source.findMany({ where: { aiEmployeeId: id } });
      const result = await buildBrain(
        employee.productName,
        employee.productUrl,
        sources.map((s) => s.content ?? "").filter(Boolean),
      );

      await prisma.$transaction(async (tx) => {
        let source = sources.find((s) => s.type === "PRODUCT_URL");
        if (!source) {
          source = await tx.source.create({
            data: {
              aiEmployeeId: id,
              type: "PRODUCT_URL",
              name: "製品サイト",
              url: employee.productUrl,
              status: "READY",
            },
          });
        }
        // isEdited=trueのノードは残し、自動生成分のみ入れ替える
        await tx.knowledgeNode.deleteMany({ where: { aiEmployeeId: id, isEdited: false } });
        for (const n of result.nodes) {
          await tx.knowledgeNode.create({
            data: { aiEmployeeId: id, sourceId: source.id, ...n },
          });
        }
        const existingScenario = await tx.demoScenario.findFirst({
          where: { aiEmployeeId: id, isDefault: true },
        });
        if (!existingScenario) {
          const scenario = await tx.demoScenario.create({
            data: { aiEmployeeId: id, title: "基本デモ", isDefault: true },
          });
          for (const s of result.steps) {
            await tx.demoStep.create({ data: { scenarioId: scenario.id, ...s } });
          }
        }
        await tx.persona.update({
          where: { aiEmployeeId: id },
          data: { greeting: result.greeting },
        });
        await tx.aiEmployee.update({ where: { id }, data: { brainStatus: "READY" } });
      });

      const counts = {
        nodes: await prisma.knowledgeNode.count({ where: { aiEmployeeId: id } }),
        steps: await prisma.demoStep.count({ where: { scenario: { aiEmployeeId: id } } }),
      };
      return NextResponse.json({ brainStatus: "READY", counts }, { status: 202 });
    } catch (e) {
      console.error("brain build failed", e);
      await prisma.aiEmployee.update({ where: { id }, data: { brainStatus: "FAILED" } });
      return NextResponse.json({ brainStatus: "FAILED" }, { status: 202 });
    }
  } catch (e) {
    return handleApiError(e);
  }
}
