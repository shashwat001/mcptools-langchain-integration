export const ollamaConfig = {
    baseUrl: "http://localhost:11434",
    model: "mistral:latest",
    temperature: 0.7,
    maxRetries: 2
};

export const mcpConfig = {
    serverUrl: 'http://localhost:7000/sse',
    clientInfo: {
        name: 'ollama-client',
        version: '1.0.0'
    }
};