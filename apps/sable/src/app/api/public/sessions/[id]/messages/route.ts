import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api-utils";
import { handleBuyerMessage } from "@/lib/session-service";

const Body = z.object({ text: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { text } = Body.parse(await req.json());
    const outcome = await handleBuyerMessage(id, text);
    return NextResponse.json(outcome);
  } catch (e) {
    return handleApiError(e);
  }
}
