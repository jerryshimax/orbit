#!/usr/bin/env npx tsx
/**
 * Orbit — Universal CRM MCP Server
 *
 * All tool definitions come from the canonical schema (src/lib/tools/schema.ts).
 * All handler logic lives in tool-handlers.ts.
 * This file only wires MCP transport → schema → handlers.
 *
 * Adding a new tool: update schema.ts + tool-handlers.ts. This file auto-picks it up.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getMcpToolDefs } from "../lib/tools/schema.js";
import { executeToolCall } from "../lib/chat/tools.js";

// ── MCP Server ────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "orbit",
  version: "3.0.0",
});

// ── Register all tools from canonical schema ──────────────────────────────

for (const def of getMcpToolDefs()) {
  server.tool(
    def.name,
    def.description,
    def.inputSchema,
    async (params) => {
      try {
        // MCP server runs without a CurrentUser context (Cloud dispatches
        // via CLI, not the web app). Pass undefined → handlers fail-open
        // on scope checks, matching prior behavior.
        const result = await executeToolCall(def.name, params);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Orbit MCP error [${def.name}]: ${msg}`);
        return {
          content: [{ type: "text" as const, text: `Error: ${msg}` }],
          isError: true,
        };
      }
    },
  );
}

// ── Start Server ──────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
