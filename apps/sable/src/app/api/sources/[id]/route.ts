import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const source = await prisma.source.findUnique({ where: { id } });
    if (!source) throw new HttpError(404, "not found");
    await requireEmployee(source.aiEmployeeId);
    await prisma.source.delete({ where: { id } }); // 由来ノードはonDelete: SetNullで残る
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
