import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireEmployee } from "@/lib/api-utils";
import { generateGreeting } from "@/lib/ai/client";

const Body = z.object({ aiEmployeeId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const { aiEmployeeId } = Body.parse(await req.json());
    const { employee } = await requireEmployee(aiEmployeeId);
    const greeting = await generateGreeting(
      employee.productName,
      employee.persona?.tone ?? "FRIENDLY",
    );
    return NextResponse.json({ greeting });
  } catch (e) {
    return handleApiError(e);
  }
}
