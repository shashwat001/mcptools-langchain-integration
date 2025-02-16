export const systemPromptForTools = "In this environment you have access to a set of tools you can use to answer the user's question.\n Don't ask user to execute the functions and decide yourself whether to call the tool or not.\nNever call more than one tool at a time.";

export const ollamaConfig = {
    baseUrl: "http://localhost:11434",
    model: "llama3.1:8b-instruct-q6_K",
    temperature: 0.1,
    maxRetries: 2
};

export const mcpConfig = {
    serverUrl: 'http://localhost:7000/sse',
    clientInfo: {
        name: 'ollama-client',
        version: '1.0.0'
    }
};