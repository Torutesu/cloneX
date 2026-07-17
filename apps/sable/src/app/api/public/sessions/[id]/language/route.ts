import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

const Body = z.object({ language: z.enum(["ja", "en", "zh", "es"]) });

// 言語バッジからの手動切替(AIF-003の手動トリガー)
// NOTE: 03-api.md に明記のないエンドポイント。SCR-002「手動切替も可能」の実現に必要(build-notes.md参照)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { language } = Body.parse(await req.json());
    const session = await prisma.session.findUnique({
      where: { id },
      include: { aiEmployee: { include: { persona: true } } },
    });
    if (!session) throw new HttpError(404, "not found");
    if (session.status === "ENDED") throw new HttpError(409, "session ended");
    if (!session.aiEmployee.persona?.languages.includes(language)) {
      throw new HttpError(400, "unsupported language");
    }
    if (language === session.language) {
      return NextResponse.json({ session });
    }
    const [updated] = await prisma.$transaction([
      prisma.session.update({ where: { id }, data: { language } }),
      prisma.sessionEvent.create({
        data: {
          sessionId: id,
          type: "LANGUAGE_SWITCH",
          payload: { from: session.language, to: language },
        },
      }),
    ]);
    return NextResponse.json({ session: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
