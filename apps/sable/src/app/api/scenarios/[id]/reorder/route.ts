import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({ stepIds: z.array(z.string()).min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scenario = await prisma.demoScenario.findUnique({
      where: { id },
      include: { steps: true },
    });
    if (!scenario) throw new HttpError(404, "not found");
    await requireEmployee(scenario.aiEmployeeId);
    const { stepIds } = Body.parse(await req.json());
    if (
      stepIds.length !== scenario.steps.length ||
      !scenario.steps.every((s) => stepIds.includes(s.id))
    ) {
      throw new HttpError(400, "stepIds must contain all steps");
    }
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < stepIds.length; i++) {
        await tx.demoStep.update({ where: { id: stepIds[i] }, data: { order: -(i + 1) } });
      }
      for (let i = 0; i < stepIds.length; i++) {
        await tx.demoStep.update({ where: { id: stepIds[i] }, data: { order: i + 1 } });
      }
    });
    const steps = await prisma.demoStep.findMany({
      where: { scenarioId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ steps });
  } catch (e) {
    return handleApiError(e);
  }
}
