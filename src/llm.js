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