// tests/langchain_ollama.test.js
import { jest } from '@jest/globals';

// Create mocks before importing
const mockClient = jest.fn();
const mockOllama = jest.fn();

// Mock modules
jest.unstable_mockModule('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: mockClient
}));

jest.unstable_mockModule('@langchain/ollama', () => ({
    Ollama: mockOllama
}));

// Import mocks after module mocking
import { mockMcpTools, mockToolResponse, mockLLMResponse } from './mocks/mcpTools.js';

describe('Langchain Ollama Integration', () => {
    let mcpClient;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock MCP client
        mcpClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            request: jest.fn().mockImplementation((params) => {
                if (params.method === 'tools/list') {
                    return Promise.resolve(mockMcpTools);
                }
                if (params.method === 'tools/call') {
                    return Promise.resolve(mockToolResponse);
                }
            })
        };

        mockClient.mockImplementation(() => mcpClient);
        mockOllama.mockImplementation(() => ({
            invoke: jest.fn().mockResolvedValue(mockLLMResponse)
        }));
    });

    test('should connect to MCP server successfully', async () => {
        const { createMcpClient } = await import('../src/mcp.js');
        await createMcpClient();

        expect(mockClient).toHaveBeenCalled();
        expect(mcpClient.connect).toHaveBeenCalled();
    });

    test('should fetch available tools', async () => {
        const { fetchMcpTools } = await import('../src/mcp.js');
        const tools = await fetchMcpTools(mcpClient);

        expect(mcpClient.request).toHaveBeenCalledWith(
            { method: 'tools/list' },
            expect.any(Object)
        );
        expect(Array.isArray(tools)).toBe(true);
    });

    test('should handle list_allowed_directories tool call', async () => {
        const { createMcpTool } = await import('../src/mcp.js');

        const tool = await createMcpTool(mcpClient, mockMcpTools.tools[0]);
        const toolCallArgs = {
            name: 'list_allowed_directories',
            args: {},
            id: '1f244495-66f8-4930-891b-b311cf542951',
            type: 'tool_call'
        };

        const result = await tool.call(toolCallArgs);

        expect(result).toEqual({
            content: mockToolResponse.content[0].text,
            tool_call_id: '1f244495-66f8-4930-891b-b311cf542951',
            status: 'success',
            _getType: expect.any(Function),
            lc_direct_tool_output: true
        });
    });
});

// LLM Configuration test
describe('LLM Configuration', () => {
    test('should have valid Ollama configuration', async () => {
        const { ollamaConfig } = await import('../src/llm.js');

        expect(ollamaConfig).toMatchObject({
            baseUrl: expect.any(String),
            model: expect.any(String),
            temperature: expect.any(Number),
            maxRetries: expect.any(Number)
        });
    });

    test('should have valid MCP configuration', async () => {
        const { mcpConfig } = await import('../src/llm.js');

        expect(mcpConfig).toMatchObject({
            serverUrl: expect.any(String),
            clientInfo: {
                name: expect.any(String),
                version: expect.any(String)
            }
        });
    });
});