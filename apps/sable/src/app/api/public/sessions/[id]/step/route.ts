import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-utils";
import { handleStepChange } from "@/lib/session-service";

const Body = z.object({ order: z.number().int().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { order } = Body.parse(await req.json());
    const result = await handleStepChange(id, order);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
