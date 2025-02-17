import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport, SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { mcpConfig } from './llm.js';
import { debug } from './debug.js';
import { tool, StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
    CallToolResultSchema,
    ListToolsResultSchema,
    Tool as McpToolType
} from "@modelcontextprotocol/sdk/types.js";
import { ToolMessage } from "@langchain/core/messages";

interface JsonSchemaProperty {
    type: string;
    [key: string]: unknown;
}

interface JsonSchema {
    type: string;
    properties?: Record<string, JsonSchemaProperty>;
}

function createSchemaModel(inputSchema: JsonSchema): z.ZodObject<any> {
    if (inputSchema.type !== "object" || !inputSchema.properties) {
        throw new Error("Invalid schema type or missing properties");
    }

    const schemaProperties: Record<string, z.ZodTypeAny> = Object.entries(inputSchema.properties).reduce((acc, [key, value]) => {
        // Map JSON Schema types to Zod types
        switch (value.type) {
            case 'number':
                acc[key] = z.number();
                break;
            case 'string':
                acc[key] = z.string();
                break;
            case 'boolean':
                acc[key] = z.boolean();
                break;
            case 'array':
                acc[key] = z.array(z.any()); // You might want to map array item types too
                break;
            default:
                acc[key] = z.any();
        }
        return acc;
    }, {} as Record<string, z.ZodTypeAny>);

    return z.object(schemaProperties);
}

/** 
 * Sample config object received
{
  tags: [],
  metadata: { tool_call_id: 'db0a0bc3-c121-4c30-a0dc-e50681325606' },
  recursionLimit: 25,
  runId: undefined,
  toolCall: {
    name: 'list_directory',
    args: { path: '/home/shashwat/Projects' },
    id: 'db0a0bc3-c121-4c30-a0dc-e50681325606',
    type: 'tool_call'
  },
  configurable: { tool_call_id: 'db0a0bc3-c121-4c30-a0dc-e50681325606' },
  runName: 'list_directory'
}
 */

interface ToolConfig {
    configurable?: {
        tool_call_id?: string;
    };
}

export type McpTool = StructuredTool;

export async function createMcpTool(client: Client, mcpTool: McpToolType): Promise<McpTool> {
    return tool(
        async (toolArgs: Record<string, unknown>, config?: ToolConfig) => {
            // debug('Calling MCP tool');
            const toolCallId = config?.configurable?.tool_call_id;
            const result = await client.request(
                {
                    method: 'tools/call',
                    params: {
                        name: mcpTool.name,
                        arguments: toolArgs,
                    },
                },
                CallToolResultSchema,
            );
            debug('MCP tool response', result);
            return new ToolMessage({
                content: result.content[0].text as string,
                tool_call_id: toolCallId || "default_id",
                status: 'success',
            });
        },
        {
            name: mcpTool.name,
            description: mcpTool.description || `Tool for ${mcpTool.name}`,
            schema: createSchemaModel(mcpTool.inputSchema as JsonSchema),
        }
    );
}

export async function createMcpClient(): Promise<Client> {
    const mcpClient = new Client(
        {
            name: "ollama-client",
            version: "1.0.0"
        },
        {
            capabilities: {
                prompts: {},
                resources: {},
                tools: {}
            }
        }
    );

    const transport = new SSEClientTransport(new URL(mcpConfig.serverUrl), {
        eventSourceInit: {
            fetch: (url: URL | RequestInfo, init?: RequestInit) => fetch(url, {
                ...init,
                headers: {
                    ...init?.headers,
                    'Content-Type': 'application/json',
                }
            }),
        },
        requestInit: {
            headers: {
                'Content-Type': 'application/json',
            },
        },
    });

    try {
        console.log('\n[MCP] Connecting to server...');
        await mcpClient.connect(transport);
        console.log('[MCP] Connected successfully');
        return mcpClient;
    } catch (error) {
        if (error instanceof SseError && error.code === 401) {
            console.error('Authentication failed:', error.message);
            throw error;
        }
        console.error('Failed to connect to MCP server:', error);
        throw error;
    }
}

export async function fetchMcpTools(mcpClient: Client): Promise<McpTool[]> {
    const toolsAvailable = await mcpClient.request(
        { method: 'tools/list' },
        ListToolsResultSchema
    );
    // debug('Available MCP tools', toolsAvailable);

    console.log('\n[MCP] Creating Langchain tools from MCP tools...');
    const mcpTools = await Promise.all(
        toolsAvailable.tools.map(mcpTool => createMcpTool(mcpClient, mcpTool))
    );
    return mcpTools;
}