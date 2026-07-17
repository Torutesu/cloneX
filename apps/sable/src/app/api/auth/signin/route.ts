import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";

const Body = z.object({ email: z.string().email(), password: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { email, password } = Body.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "メールアドレスまたはパスワードが違います" },
        { status: 401 },
      );
    }
    await setSessionCookie(user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return handleApiError(e);
  }
}
