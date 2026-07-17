import { NextResponse } from "next/server";
import { Errors, errorResponse } from "@/lib/api/errors";

/**
 * /api/mcp (Streamable HTTP, Bearer ApiToken auth) — Phase 3 wires this up to the
 * same service layer as the UI API routes (dealService.search etc., see 03-api.md
 * "MCPツール一覧"). Stubbed as 501 for Phase 0-1.
 */
export async function POST() {
  return errorResponse(Errors.notImplemented("MCPサーバーは未実装です(Phase 3で実装予定)"));
}

export async function GET() {
  return NextResponse.json(
    { error: { code: "NOT_IMPLEMENTED", message: "MCPサーバーは未実装です(Phase 3で実装予定)" } },
    { status: 501 },
  );
}
