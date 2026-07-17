import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({
  title: z.string().min(1),
  route: z.string().min(1),
  selector: z.string().nullable().optional(),
  narration: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const scenario = await prisma.demoScenario.findUnique({ where: { id } });
    if (!scenario) throw new HttpError(404, "not found");
    await requireEmployee(scenario.aiEmployeeId);
    const body = Body.parse(await req.json());
    const last = await prisma.demoStep.findFirst({
      where: { scenarioId: id },
      orderBy: { order: "desc" },
    });
    const step = await prisma.demoStep.create({
      data: {
        scenarioId: id,
        order: (last?.order ?? 0) + 1,
        title: body.title,
        route: body.route,
        selector: body.selector ?? null,
        narration: body.narration,
      },
    });
    return NextResponse.json({ step });
  } catch (e) {
    return handleApiError(e);
  }
}
