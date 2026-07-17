import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

async function loadStep(id: string) {
  const step = await prisma.demoStep.findUnique({ where: { id }, include: { scenario: true } });
  if (!step) throw new HttpError(404, "not found");
  await requireEmployee(step.scenario.aiEmployeeId);
  return step;
}

const Body = z.object({
  title: z.string().min(1).optional(),
  route: z.string().min(1).optional(),
  selector: z.string().nullable().optional(),
  narration: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await loadStep(id);
    const body = Body.parse(await req.json());
    const step = await prisma.demoStep.update({ where: { id }, data: body });
    return NextResponse.json({ step });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const step = await loadStep(id);
    await prisma.$transaction(async (tx) => {
      await tx.demoStep.delete({ where: { id } });
      // orderを詰め直す
      const rest = await tx.demoStep.findMany({
        where: { scenarioId: step.scenarioId },
        orderBy: { order: "asc" },
      });
      for (let i = 0; i < rest.length; i++) {
        const r = rest[i]!;
        if (r.order !== i + 1) {
          await tx.demoStep.update({ where: { id: r.id }, data: { order: -(i + 1) } });
        }
      }
      const renumbered = await tx.demoStep.findMany({
        where: { scenarioId: step.scenarioId, order: { lt: 0 } },
      });
      for (const r of renumbered) {
        await tx.demoStep.update({ where: { id: r.id }, data: { order: -r.order } });
      }
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
