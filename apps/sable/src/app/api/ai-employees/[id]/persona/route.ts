import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";

const Body = z.object({
  displayName: z.string().min(1).optional(),
  avatarPreset: z.enum(["CIRCLE_A", "CIRCLE_B", "ROBOT", "SPARK"]).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tone: z.enum(["FRIENDLY", "PROFESSIONAL", "ENERGETIC"]).optional(),
  languages: z.array(z.enum(["ja", "en", "zh", "es"])).min(1).optional(),
  greeting: z.record(z.string(), z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const body = Body.parse(await req.json());
    const persona = await prisma.persona.update({ where: { aiEmployeeId: id }, data: body });
    return NextResponse.json({ persona });
  } catch (e) {
    return handleApiError(e);
  }
}
