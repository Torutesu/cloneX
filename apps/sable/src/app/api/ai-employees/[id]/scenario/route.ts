import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const scenario = await prisma.demoScenario.findFirst({
      where: { aiEmployeeId: id, isDefault: true },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ scenario, steps: scenario?.steps ?? [] });
  } catch (e) {
    return handleApiError(e);
  }
}
