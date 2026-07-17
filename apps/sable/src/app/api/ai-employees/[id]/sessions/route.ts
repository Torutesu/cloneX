import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { Prisma, SessionStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireEmployee(id);
    const sp = req.nextUrl.searchParams;
    const where: Prisma.SessionWhereInput = { aiEmployeeId: id };
    if (sp.get("includeRehearsal") !== "true") where.mode = "LIVE";
    if (sp.get("status")) where.status = sp.get("status") as SessionStatus;
    if (sp.get("language")) where.language = sp.get("language")!;
    const sessions = await prisma.session.findMany({
      where,
      include: {
        qualification: { select: { id: true } },
        events: { where: { type: "LANGUAGE_SWITCH" }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { startedAt: "desc" },
    });
    return NextResponse.json({ sessions });
  } catch (e) {
    return handleApiError(e);
  }
}
