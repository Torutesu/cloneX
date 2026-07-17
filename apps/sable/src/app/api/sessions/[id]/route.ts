import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { HttpError } from "@/lib/session-service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        turns: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        qualification: true,
      },
    });
    if (!session) throw new HttpError(404, "not found");
    await requireEmployee(session.aiEmployeeId);
    return NextResponse.json({
      session,
      turns: session.turns,
      events: session.events,
      qualification: session.qualification,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
