import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, ToolMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { ollamaConfig, systemPromptForTools } from './llm.js';
import { createMcpClient, fetchMcpTools, McpTool } from './mcp.js';
import { debug } from './debug.js';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import readline, { Interface } from 'readline';

async function createChatInterface(): Promise<Interface> {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });
}

async function askQuestion(rl: Interface, question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer: string) => {
            resolve(answer);
        });
    });
}

const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemPromptForTools],
    new MessagesPlaceholder("chat_history")
]);

async function getPromptWithHistory(messages: BaseMessage[], newMessage?: BaseMessage): Promise<BaseMessage[]> {
    if (newMessage) {
        messages.push(newMessage);
    }
    const formattedPrompt = await promptTemplate.formatMessages({
        chat_history: messages
    });
    // console.log("Formatted Prompt: ", formattedPrompt);
    return formattedPrompt;
}

const printStreamingToken = {
    callbacks: [
        {
            handleLLMNewToken(token: string) {
                process.stdout.write(token);
            },
        },
    ],
};
async function main() {
    // Initialize MCP client
    const mcpClient = await createMcpClient();
    // Get available tools from MCP
    console.log('\n[MCP] Fetching available tools...');
    const mcpTools = await fetchMcpTools(mcpClient);

    const toolsByName: Record<string, McpTool> = Object.fromEntries(
        mcpTools.map(tool => [tool.name, tool])
    );

    // Create an Ollama instance
    const ollama = new ChatOllama(ollamaConfig);
    const llmWithTools = ollama.bindTools(mcpTools);

    const rl = await createChatInterface();
    const messages: BaseMessage[] = [];

    console.log('Chat session started. Press Ctrl+D to exit.');
    console.log('----------------------------------------');

    try {
        while (true) {
            const userQuery = await askQuestion(rl, 'You: ');
            if (userQuery === null || userQuery === undefined) {
                // Ctrl+D was pressed
                break;
            }

            let aiMessage = await llmWithTools.invoke(
                await getPromptWithHistory(messages, new HumanMessage(userQuery)),
                printStreamingToken
            ) as AIMessage;

            messages.push(aiMessage);

            while (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                for (const toolCall of aiMessage.tool_calls as ToolCall[]) {
                    const selectedTool = toolsByName[toolCall.name];
                    if (selectedTool) {
                        const toolMessage = await selectedTool.invoke(toolCall, printStreamingToken);
                        messages.push(toolMessage);
                    } else {
                        const noToolMessage = new ToolMessage({
                            content: `No such "${toolCall.name}" exists.`,
                            tool_call_id: toolCall.id || "default_id"
                        });
                        messages.push(noToolMessage);
                    }
                }

                aiMessage = await llmWithTools.invoke(
                    await getPromptWithHistory(messages), printStreamingToken
                ) as AIMessage;

                messages.push(aiMessage);
            }
        }
    } catch (error) {
        console.error("Error:", error);
        if (error instanceof Error) {
            console.error("Error details:", error.message);
        }
    }
}

// Run the main function
main().catch(console.error);