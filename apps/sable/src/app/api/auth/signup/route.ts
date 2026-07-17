import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";

const Body = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = Body.parse(await req.json());
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "このメールアドレスは登録済みです" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await bcrypt.hash(password, 10) },
    });
    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return handleApiError(e);
  }
}
