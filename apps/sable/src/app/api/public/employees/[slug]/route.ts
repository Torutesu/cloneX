import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const employee = await prisma.aiEmployee.findUnique({
      where: { slug },
      include: { persona: true },
    });
    if (!employee || employee.status !== "PUBLISHED" || !employee.persona) {
      return NextResponse.json({ error: "not available" }, { status: 404 });
    }
    const p = employee.persona;
    return NextResponse.json({
      productName: employee.productName,
      persona: {
        displayName: p.displayName,
        avatarPreset: p.avatarPreset,
        accentColor: p.accentColor,
      },
      languages: p.languages,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
