import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { GapStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const status = req.nextUrl.searchParams.get("status");
    const gaps = await prisma.knowledgeGap.findMany({
      where: { aiEmployeeId: id, ...(status ? { status: status as GapStatus } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ gaps });
  } catch (e) {
    return handleApiError(e);
  }
}
