import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { HttpError, loadSessionFull } from "@/lib/session-service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await loadSessionFull(id);
    if (!session) throw new HttpError(404, "not found");
    const persona = session.aiEmployee.persona!;
    return NextResponse.json({
      session: {
        id: session.id,
        mode: session.mode,
        status: session.status,
        language: session.language,
        currentStepOrder: session.currentStepOrder,
        buyerName: session.buyerName,
        summary: session.summary,
        slug: session.aiEmployee.slug,
      },
      productName: session.aiEmployee.productName,
      productUrl: session.aiEmployee.productUrl,
      persona: {
        displayName: persona.displayName,
        avatarPreset: persona.avatarPreset,
        accentColor: persona.accentColor,
        languages: persona.languages,
      },
      steps: (session.scenario?.steps ?? []).map((s) => ({
        order: s.order,
        title: s.title,
        route: s.route,
        selector: s.selector,
      })),
      turns: session.turns.map((t) => ({
        id: t.id,
        role: t.role,
        text: t.text,
        language: t.language,
        meta: t.meta,
        createdAt: t.createdAt,
      })),
      events: session.events.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
