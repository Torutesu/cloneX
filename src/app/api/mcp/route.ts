import type { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveWorkspaceByToken } from "@/lib/services/tokenService";
import { errorResponse, Errors } from "@/lib/api/errors";
import { executeTool, toolDefs, type ToolName } from "@/lib/ai/tools";

/**
 * /api/mcp — Streamable HTTP MCP server (03-api.md). Auth: `Authorization: Bearer
 * <ApiToken平文>` (tokenService.resolveWorkspaceByToken hashes + looks up + bumps
 * lastUsedAt). Every tool is a thin pass-through to src/lib/ai/tools.ts, which is the
 * same wrapper layer AIF-002/003's chat tool-use loop calls — "MCPファースト"
 * (03-api.md): MCP and the UI's API routes both bottom out in src/lib/services/*.
 *
 * Stateless per request (no sessionIdGenerator passed to the transport): a fresh
 * McpServer + transport is built for every HTTP call, scoped to the workspace
 * resolved from that call's Bearer token. No session store needed since this
 * server only exposes stateless tool calls (no resources/prompts/sampling that
 * would need session-scoped state).
 */

function buildServer(workspaceId: string): McpServer {
  const server = new McpServer({ name: "clonex-mcp", version: "1.0.0" });
  for (const name of Object.keys(toolDefs) as ToolName[]) {
    const def = toolDefs[name];
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.schema.shape },
      async (args) => {
        try {
          const result = await executeTool(workspaceId, name, args);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : "ツール実行に失敗しました";
          return { content: [{ type: "text", text: message }], isError: true };
        }
      },
    );
  }
  return server;
}

async function authenticate(req: NextRequest): Promise<string | null> {
  const header = req.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const workspace = await resolveWorkspaceByToken(match[1]!);
  return workspace?.id ?? null;
}

async function handle(req: NextRequest): Promise<Response> {
  const workspaceId = await authenticate(req);
  if (!workspaceId) return errorResponse(Errors.unauthorized());

  const server = buildServer(workspaceId);
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function DELETE(req: NextRequest) {
  return handle(req);
}
