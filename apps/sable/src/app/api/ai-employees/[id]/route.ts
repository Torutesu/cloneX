import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { employee } = await requireEmployee(id);
    const [nodeCount, stepCount] = await Promise.all([
      prisma.knowledgeNode.count({ where: { aiEmployeeId: id } }),
      prisma.demoStep.count({ where: { scenario: { aiEmployeeId: id } } }),
    ]);
    return NextResponse.json({ employee, counts: { nodes: nodeCount, steps: stepCount } });
  } catch (e) {
    return handleApiError(e);
  }
}

const Body = z.object({ status: z.enum(["DRAFT", "PUBLISHED"]).optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { employee } = await requireEmployee(id);
    const body = Body.parse(await req.json());
    if (body.status === "PUBLISHED" && employee.brainStatus !== "READY") {
      return NextResponse.json(
        { error: "Brain構築が完了するまで公開できません" },
        { status: 400 },
      );
    }
    const updated = await prisma.aiEmployee.update({
      where: { id },
      data: { ...(body.status ? { status: body.status } : {}) },
      include: { persona: true },
    });
    return NextResponse.json({ employee: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
