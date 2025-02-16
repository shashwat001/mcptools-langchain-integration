import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import cors from "cors";

// Create an MCP server
const server = new McpServer({
  name: "Demo",
  version: "1.0.0"
});

// Add an addition tool
server.tool("add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }]
  })
);

// Add a dynamic greeting resource
server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

server.prompt(
  "review-code",
  { code: z.string() },
  ({ code }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please review this code:\n\n${code}`
      }
    }]
  })
);

const app = express();

// Keep track of active transport
let currentTransport = null;

app.get("/sse", async (req, res) => {
  try {
    console.log("New SSE connection");

    const transport = new SSEServerTransport("/messages", res);
    currentTransport = transport;

    // Clean up on client disconnect
    res.on('close', () => {
      console.log("SSE connection closed");
      if (currentTransport === transport) {
        currentTransport = null;
      }
    });

    await server.connect(transport);
  } catch (error) {
    console.error("Error in /sse route:", error);
    res.status(500).end();
  }
});

app.post("/messages", async (req, res) => {
  try {
    if (!currentTransport) {
      console.error("No active SSE connection");
      return res.status(400).json({ error: "No active SSE connection" });
    }

    console.log("Received message:", req.body);
    await currentTransport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error in /messages route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});