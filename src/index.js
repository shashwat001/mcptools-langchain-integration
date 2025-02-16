import { ChatOllama } from "@langchain/ollama";
import { HumanMessage } from "@langchain/core/messages";
import { ollamaConfig } from './llm.js';
import { createMcpClient, fetchMcpTools } from './mcp.js';
import { debug } from './debug.js';

async function main() {
    // Initialize MCP client
    const mcpClient = await createMcpClient();
    // Get available tools from MCP
    console.log('\n[MCP] Fetching available tools...');
    const mcpTools = await fetchMcpTools(mcpClient);

    const toolsByName = Object.fromEntries(
        mcpTools.map(tool => [tool.name, tool])
    );

    // Create an Ollama instance
    const ollama = new ChatOllama(ollamaConfig);
    const llmWithTools = ollama.bindTools(mcpTools);

    try {
        const userQuery = "Can you list the directories which you can access on my system?";
        console.log('\n[LLM] User query:', userQuery);
        const messages = [new HumanMessage(userQuery)];

        const aiMessage = await llmWithTools.invoke(messages);
        // debug('LLM response', aiMessage);
        messages.push(aiMessage);

        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            for (const toolCall of aiMessage.tool_calls) {
                console.log("Toolcall is ", toolCall);
                const selectedTool = toolsByName[toolCall.name];
                if (selectedTool) {
                    const toolMessage = await selectedTool.invoke(toolCall);
                    debug('Tool execution result', toolMessage);
                    messages.push(toolMessage);
                }
            }

            const response = await llmWithTools.invoke(messages);
            debug('Final LLM response', response);
        }

    } catch (error) {
        console.error("Error:", error);
        console.error("Error details:", error.message);
    }
}

// Run the main function
main().catch(console.error);
