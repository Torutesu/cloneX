import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// SCR-017 [リハーサルを開始] → REHEARSALセッションを作成してライブ画面へリダイレクト
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const employee = await prisma.aiEmployee.findUnique({
    where: { slug },
    include: { persona: true, scenarios: { where: { isDefault: true } } },
  });
  if (!user || !employee || employee.ownerId !== user.id || !employee.persona) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }
  const language = employee.persona.languages.includes("ja")
    ? "ja"
    : (employee.persona.languages[0] ?? "ja");
  const greeting =
    (employee.persona.greeting as Record<string, string>)[language] ?? "こんにちは!";
  const session = await prisma.session.create({
    data: {
      aiEmployeeId: employee.id,
      scenarioId: employee.scenarios[0]?.id,
      mode: "REHEARSAL",
      language,
    },
  });
  await prisma.sessionEvent.create({
    data: { sessionId: session.id, type: "SESSION_START", payload: { language } },
  });
  await prisma.transcriptTurn.create({
    data: {
      sessionId: session.id,
      role: "AI",
      text: greeting,
      language,
      stepOrder: 0,
      meta: { greeting: true },
    },
  });
  return NextResponse.redirect(new URL(`/d/${slug}/s/${session.id}`, req.url));
}
