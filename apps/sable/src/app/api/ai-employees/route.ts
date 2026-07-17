import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleApiError, slugify } from "@/lib/api-utils";
import { fixtureGreeting } from "@/lib/ai/fixture";

export async function GET() {
  try {
    const user = await requireUser();
    const employees = await prisma.aiEmployee.findMany({
      where: { ownerId: user.id },
      include: { persona: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ employees });
  } catch (e) {
    return handleApiError(e);
  }
}

const Body = z.object({
  name: z.string().min(1),
  productName: z.string().min(1),
  productUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = Body.parse(await req.json());
    const employee = await prisma.aiEmployee.create({
      data: {
        ownerId: user.id,
        name: `${body.productName}デモ担当`,
        productName: body.productName,
        productUrl: body.productUrl,
        slug: slugify(body.productName),
        persona: {
          create: {
            displayName: body.name,
            greeting: fixtureGreeting(body.productName),
          },
        },
      },
      include: { persona: true },
    });
    return NextResponse.json({ employee });
  } catch (e) {
    return handleApiError(e);
  }
}
