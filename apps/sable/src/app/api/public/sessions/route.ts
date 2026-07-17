import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({
  slug: z.string(),
  buyerName: z.string().optional(),
  buyerCompany: z.string().optional(),
  language: z.string().default("ja"),
  mode: z.enum(["LIVE", "REHEARSAL"]).default("LIVE"),
});

export async function POST(req: NextRequest) {
  try {
    const body = Body.parse(await req.json());
    const employee = await prisma.aiEmployee.findUnique({
      where: { slug: body.slug },
      include: {
        persona: true,
        scenarios: { where: { isDefault: true }, include: { steps: true } },
      },
    });
    if (!employee || !employee.persona) throw new HttpError(404, "not available");

    if (body.mode === "REHEARSAL") {
      const user = await getCurrentUser();
      if (!user || employee.ownerId !== user.id) throw new HttpError(401, "unauthorized");
    } else if (employee.status !== "PUBLISHED") {
      throw new HttpError(404, "not available");
    }

    const language = employee.persona.languages.includes(body.language) ? body.language : "ja";
    const scenario = employee.scenarios[0] ?? null;
    const greeting =
      (employee.persona.greeting as Record<string, string>)[language] ??
      (employee.persona.greeting as Record<string, string>).ja ??
      "こんにちは!";

    const session = await prisma.session.create({
      data: {
        aiEmployeeId: employee.id,
        scenarioId: scenario?.id,
        mode: body.mode,
        buyerName: body.buyerName || null,
        buyerCompany: body.buyerCompany || null,
        language,
      },
    });
    await prisma.sessionEvent.create({
      data: { sessionId: session.id, type: "SESSION_START", payload: { language } },
    });
    const greetingTurn = await prisma.transcriptTurn.create({
      data: {
        sessionId: session.id,
        role: "AI",
        text: greeting,
        language,
        stepOrder: 0,
        meta: { greeting: true },
      },
    });
    return NextResponse.json({ session, greetingTurn });
  } catch (e) {
    return handleApiError(e);
  }
}
