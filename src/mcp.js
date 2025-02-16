import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport, SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { mcpConfig } from './llm.js';
import { debug } from './debug.js';
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
    CallToolResultSchema,
    ListToolsResultSchema
} from "@modelcontextprotocol/sdk/types.js";

function createSchemaModel(inputSchema) {
    if (inputSchema.type !== "object" || !inputSchema.properties) {
        throw new Error("Invalid schema type or missing properties");
    }

    const schemaProperties = Object.entries(inputSchema.properties).reduce((acc, [key, value]) => {
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
    }, {});
    return z.object(schemaProperties);
}

export async function createMcpTool(client, mcpTool) {
    return tool(
        async (toolCall) => {
            debug('Calling MCP tool - Input:', toolCall);

            const result = await client.request(
                {
                    method: 'tools/call',
                    params: {
                        name: mcpTool.name,
                        arguments: toolCall,
                    },
                },
                CallToolResultSchema,
            );
            debug('MCP tool response', result);
            return {
                content: result.content[0].text,
                tool_call_id: 'toolCallId',
                status: 'success',
                _getType: () => 'tool',
                lc_direct_tool_output: true
            }
        },
        {
            name: mcpTool.name,
            description: mcpTool.description || `Tool for ${mcpTool.name}`,
            schema: createSchemaModel(mcpTool.inputSchema),
        }
    );
}


export async function createMcpClient() {
    const mcpClient = new Client(
        mcpConfig.clientInfo,
        { capabilities: {} }
    );

    const transport = new SSEClientTransport(new URL(mcpConfig.serverUrl), {
        eventSourceInit: {
            fetch: (url, init) => fetch(url, {
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

export async function fetchMcpTools(mcpClient) {
    const toolsAvailable = await mcpClient.request(
        { method: 'tools/list' },
        ListToolsResultSchema
    );
    // debug('Available MCP tools', toolsAvailable);

    // Create Langchain tools from MCP tools
    console.log('\n[MCP] Creating Langchain tools from MCP tools...');
    const mcpTools = await Promise.all(
        toolsAvailable.tools.map(mcpTool => createMcpTool(mcpClient, mcpTool))
    );
    return mcpTools;
}
