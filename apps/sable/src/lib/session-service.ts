// 買い手セッションの進行ロジック(messages / step / end で共有)
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { chat, detectLanguage, summarize } from "./ai/client";

export async function loadSessionFull(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      aiEmployee: { include: { persona: true, knowledgeNodes: true } },
      scenario: { include: { steps: { orderBy: { order: "asc" } } } },
      turns: { orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export type MessageOutcome = {
  buyerTurn: unknown;
  aiTurn: unknown;
  directives: { language?: string; stepOrder?: number; gapRecorded?: boolean };
};

export async function handleBuyerMessage(sessionId: string, text: string): Promise<MessageOutcome> {
  const session = await loadSessionFull(sessionId);
  if (!session) throw new HttpError(404, "session not found");
  if (session.status === "ENDED") throw new HttpError(409, "session ended");
  const persona = session.aiEmployee.persona!;
  const steps = session.scenario?.steps ?? [];

  // AIF-003: 言語判定→即時切替
  const detected = detectLanguage(text, persona.languages);
  const newLanguage = detected ?? session.language;
  const switched = newLanguage !== session.language;

  // AIF-002/004: 応答生成(失敗時はDBに何も書かずエラーを返す)
  const result = await chat({
    question: text,
    language: newLanguage,
    personaName: persona.displayName,
    tone: persona.tone,
    productName: session.aiEmployee.productName,
    nodes: session.aiEmployee.knowledgeNodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
    })),
    steps: steps.map((s) => ({ order: s.order, title: s.title })),
    currentStepOrder: session.currentStepOrder,
    history: session.turns.slice(-20).map((t) => ({ role: t.role, text: t.text })),
  });

  const jumpOrder =
    result.jumpToStepOrder && steps.some((s) => s.order === result.jumpToStepOrder)
      ? result.jumpToStepOrder
      : undefined;

  const outcome = await prisma.$transaction(async (tx) => {
    if (switched) {
      await tx.session.update({ where: { id: sessionId }, data: { language: newLanguage } });
      await tx.sessionEvent.create({
        data: {
          sessionId,
          type: "LANGUAGE_SWITCH",
          payload: { from: session.language, to: newLanguage },
        },
      });
    }
    const buyerTurn = await tx.transcriptTurn.create({
      data: {
        sessionId,
        role: "BUYER",
        text,
        language: newLanguage,
        stepOrder: session.currentStepOrder,
      },
    });

    let gapRecorded = false;
    if (!result.confident) {
      const gap = await tx.knowledgeGap.create({
        data: {
          aiEmployeeId: session.aiEmployeeId,
          question: text,
          language: newLanguage,
          sessionId,
        },
      });
      await tx.sessionEvent.create({
        data: { sessionId, type: "GAP_RECORDED", payload: { gapId: gap.id, question: text } },
      });
      gapRecorded = true;
    }

    let stepOrder: number | undefined;
    if (jumpOrder) {
      await tx.session.update({ where: { id: sessionId }, data: { currentStepOrder: jumpOrder } });
      const step = steps.find((s) => s.order === jumpOrder)!;
      await tx.sessionEvent.create({
        data: { sessionId, type: "STEP_SHOWN", payload: { order: step.order, title: step.title } },
      });
      stepOrder = jumpOrder;
    }

    const aiTurn = await tx.transcriptTurn.create({
      data: {
        sessionId,
        role: "AI",
        text: result.answer,
        language: newLanguage,
        stepOrder: stepOrder ?? session.currentStepOrder,
        meta: {
          referencedNodeIds: result.referencedNodeIds,
          gapRecorded,
          ...(stepOrder ? { jumpedTo: stepOrder } : {}),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      buyerTurn,
      aiTurn,
      directives: {
        ...(switched ? { language: newLanguage } : {}),
        ...(stepOrder ? { stepOrder } : {}),
        gapRecorded,
      },
    };
  });

  return outcome;
}

export async function handleStepChange(sessionId: string, order: number) {
  const session = await loadSessionFull(sessionId);
  if (!session) throw new HttpError(404, "session not found");
  if (session.status === "ENDED") throw new HttpError(409, "session ended");
  const steps = session.scenario?.steps ?? [];
  const step = steps.find((s) => s.order === order);
  if (!step) throw new HttpError(400, "invalid step order");
  if (order === session.currentStepOrder) return { session, narrationTurn: null };

  const alreadyShown = session.events.some(
    (e) => e.type === "STEP_SHOWN" && (e.payload as { order?: number }).order === order,
  );

  return prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: { currentStepOrder: order },
    });
    await tx.sessionEvent.create({
      data: { sessionId, type: "STEP_SHOWN", payload: { order, title: step.title } },
    });
    let narrationTurn = null;
    if (!alreadyShown) {
      const narrations = step.narration as Record<string, string>;
      const text = narrations[session.language] ?? narrations.ja ?? Object.values(narrations)[0] ?? "";
      narrationTurn = await tx.transcriptTurn.create({
        data: {
          sessionId,
          role: "AI",
          text,
          language: session.language,
          stepOrder: order,
          meta: { narration: true },
        },
      });
    }
    return { session: updated, narrationTurn };
  });
}

export async function handleSessionEnd(sessionId: string) {
  const session = await loadSessionFull(sessionId);
  if (!session) throw new HttpError(404, "session not found");
  if (session.status === "ENDED") return { session, summary: session.summary };

  const steps = session.scenario?.steps ?? [];
  const shownOrders = new Set(
    session.events
      .filter((e) => e.type === "STEP_SHOWN")
      .map((e) => (e.payload as { order?: number }).order),
  );
  const gapQuestions = session.events
    .filter((e) => e.type === "GAP_RECORDED")
    .map((e) => (e.payload as { question?: string }).question ?? "");

  // AIF-005: 失敗してもセッション終了自体は成功させる
  let summary: string | null = null;
  let qualification: Awaited<ReturnType<typeof summarize>>["qualification"] | null = null;
  try {
    const result = await summarize({
      buyerName: session.buyerName,
      buyerCompany: session.buyerCompany,
      language: session.language,
      productName: session.aiEmployee.productName,
      turns: session.turns.map((t) => ({ role: t.role, text: t.text, language: t.language })),
      shownStepTitles: steps.filter((s) => shownOrders.has(s.order)).map((s) => s.title),
      gapQuestions,
    });
    summary = result.summary;
    qualification = result.qualification;
  } catch {
    summary = null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const s = await tx.session.update({
      where: { id: sessionId },
      data: { status: "ENDED", endedAt: new Date(), summary },
    });
    await tx.sessionEvent.create({ data: { sessionId, type: "SESSION_END", payload: {} } });
    if (qualification) {
      await tx.qualification.create({
        data: {
          sessionId,
          useCase: qualification.useCase,
          teamSize: qualification.teamSize,
          timeline: qualification.timeline,
          interest: qualification.interest,
          summary: qualification.summary,
        },
      });
    }
    return s;
  });

  return { session: updated, summary };
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
