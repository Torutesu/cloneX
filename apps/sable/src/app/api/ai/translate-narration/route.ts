import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";
import { translate } from "@/lib/ai/client";

const Body = z.object({ stepId: z.string(), targetLang: z.enum(["ja", "en", "zh", "es"]) });

export async function POST(req: NextRequest) {
  try {
    const { stepId, targetLang } = Body.parse(await req.json());
    const step = await prisma.demoStep.findUnique({ where: { id: stepId }, include: { scenario: true } });
    if (!step) throw new HttpError(404, "not found");
    await requireEmployee(step.scenario.aiEmployeeId);
    const narration = step.narration as Record<string, string>;
    const sourceText = narration.ja ?? narration.en ?? Object.values(narration)[0] ?? "";
    const translated = await translate(sourceText, targetLang);
    return NextResponse.json({ narration: translated });
  } catch (e) {
    return handleApiError(e);
  }
}
