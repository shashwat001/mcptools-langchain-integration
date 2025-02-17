import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { ollamaConfig, systemPromptForTools } from './llm.js';
import { createMcpClient, fetchMcpTools } from './mcp.js';
import { debug } from './debug.js';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import readline from 'readline';

async function createChatInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });
}

async function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemPromptForTools],
    new MessagesPlaceholder("chat_history")
]);

async function getPromptWithHistory(messages, newMessage) {
    if (newMessage) {
        messages.push(newMessage);
    }
    const formattedPrompt = await promptTemplate.formatMessages({
        chat_history: messages
    });
    console.log("Formatted Prompt: ", formattedPrompt);
    return formattedPrompt;
}

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

    const rl = await createChatInterface();
    const messages = new Array()

    console.log('Chat session started. Press Ctrl+D to exit.');
    console.log('----------------------------------------');

    try {
        while (true) {
            const userQuery = await askQuestion(rl, 'You: ');
            if (userQuery === null || userQuery === undefined) {
                // Ctrl+D was pressed
                break;
            }

            console.log('\n[LLM] User query:', userQuery);

            let aiMessage = await llmWithTools.invoke((await getPromptWithHistory(messages, new HumanMessage(userQuery))));
            debug('LLM response', aiMessage);
            messages.push(aiMessage);

            while (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
                for (const toolCall of aiMessage.tool_calls) {
                    console.log("Toolcall is ", toolCall);
                    const selectedTool = toolsByName[toolCall.name];
                    if (selectedTool) {
                        const toolMessage = await selectedTool.invoke(toolCall);
                        debug('Tool execution result', toolMessage);
                        messages.push(toolMessage);
                    } else {
                        const noToolMessage = new ToolMessage({
                            content: `No such "${toolCall.name}" exists.`,
                            tool_call_id: toolCall.id
                        });
                        debug('No tool found message', noToolMessage);
                        messages.push(noToolMessage);
                    }
                }

                aiMessage = await llmWithTools.invoke(await getPromptWithHistory(messages));
                messages.push(aiMessage)
                console.log('Final LLM response', aiMessage);
            }
            console.log('Assistant:', aiMessage.content);

        }

    } catch (error) {
        console.error("Error:", error);
        console.error("Error details:", error.message);
    }
}

// Run the main function
main().catch(console.error);