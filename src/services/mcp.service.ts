import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class McpService {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  constructor(token?: string) {
    const url = new URL("http://localhost:23373/v0/mcp");
    this.transport = new StreamableHTTPClientTransport(url, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    this.client = new Client(
      { name: "parenting-automation", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect() {
    console.log("[MCP] Connecting to Beeper MCP server...");
    await this.client.connect(this.transport);
    console.log("[MCP] Connected.");
  }

  async listTools() {
    const result = await this.client.listTools();
    return result.tools;
  }

  async callTool(name: string, args: any) {
    console.log(`[MCP] Calling tool: ${name} with args:`, JSON.stringify(args));
    const result = await this.client.callTool({
      name,
      arguments: args
    });
    return result.content;
  }

  /**
   * Helper to format MCP tools for Gemini function calling.
   */
  async getGeminiTools() {
    const mcpTools = await this.listTools();
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }));
  }
}
