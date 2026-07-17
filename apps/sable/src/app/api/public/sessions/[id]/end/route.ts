import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { handleSessionEnd } from "@/lib/session-service";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await handleSessionEnd(id);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
