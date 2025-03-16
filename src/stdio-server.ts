import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { SliteApiClient } from "./sliteApi.js";

// Load environment variables
dotenv.config();

// Check if API key is available
if (!process.env.SLITE_API_KEY) {
  console.error("ERROR: SLITE_API_KEY is not set in .env file");
  process.exit(1);
}

// Create an MCP server
const server = new McpServer({
  name: "Slite MCP Server (stdio)",
  version: "1.0.0"
});

// Initialize Slite API client
const sliteClient = new SliteApiClient(process.env.SLITE_API_KEY);

// Tool for searching notes
server.tool(
  "search-notes",
  {
    query: z.string().describe("The search query"),
    limit: z.number().optional().describe("Maximum number of results to return")
  },
  async ({ query, limit = 10 }) => {
    try {
      const results = await sliteClient.searchNotes(query, limit);

      return {
        content: [
          { 
            type: "text", 
            text: `Search results for "${query}":\n\n${
              results.map(item => 
                `- ${item.title}: ${item.snippet || 'No snippet available'} (${item.type})`
              ).join('\n')
            }`
          }
        ]
      };
    } catch (error: unknown) {
      console.error("Error searching notes:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Failed to search: ${errorMessage}` }]
      };
    }
  }
);

// Tool for creating notes
server.tool(
  "create-note",
  {
    title: z.string().describe("Note title"),
    markdown: z.string().describe("Note content in markdown format"),
    parentNoteId: z.string().optional().describe("Parent note ID"),
    attributes: z.array(z.string()).optional().describe("Note attributes")
  },
  async ({ title, markdown, parentNoteId, attributes }) => {
    try {
      const note = await sliteClient.createNote(title, markdown, parentNoteId, undefined, attributes);

      return {
        content: [
          { 
            type: "text", 
            text: `Note created successfully!\nTitle: ${note.title}\nID: ${note.id}`
          }
        ]
      };
    } catch (error: unknown) {
      console.error("Error creating note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Failed to create note: ${errorMessage}` }]
      };
    }
  }
);

// Tool for updating notes
server.tool(
  "update-note",
  {
    noteId: z.string().describe("Note ID to update"),
    title: z.string().optional().describe("New note title"),
    markdown: z.string().optional().describe("New note content in markdown format"),
    parentNoteId: z.string().optional().describe("New parent note ID"),
    attributes: z.array(z.string()).optional().describe("New note attributes")
  },
  async ({ noteId, title, markdown, parentNoteId, attributes }) => {
    if (!title && !markdown && !parentNoteId && !attributes) {
      return {
        content: [{ type: "text", text: "You must provide at least one field to update." }]
      };
    }

    try {
      const updates: { 
        title?: string; 
        markdown?: string;
        parentNoteId?: string;
        attributes?: string[];
      } = {};
      
      if (title) updates.title = title;
      if (markdown) updates.markdown = markdown;
      if (parentNoteId) updates.parentNoteId = parentNoteId;
      if (attributes) updates.attributes = attributes;

      const note = await sliteClient.updateNote(noteId, updates);

      return {
        content: [
          { 
            type: "text", 
            text: `Note updated successfully!\nTitle: ${note.title}\nID: ${note.id}`
          }
        ]
      };
    } catch (error: unknown) {
      console.error("Error updating note:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Failed to update note: ${errorMessage}` }]
      };
    }
  }
);

// Tool for getting Slite Ask information
server.tool(
  "get-ask-info",
  {},
  async () => {
    try {
      const askInfo = await sliteClient.getAskInfo();

      return {
        content: [
          { 
            type: "text", 
            text: `Slite Ask Information:\n${JSON.stringify(askInfo, null, 2)}`
          }
        ]
      };
    } catch (error: unknown) {
      console.error("Error getting Ask info:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Failed to get Ask info: ${errorMessage}` }]
      };
    }
  }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();

// Handle errors
transport.onerror = (error: Error) => {
  console.error("MCP Server error:", error);
};

// Connect the transport to the server
server.connect(transport).catch(error => {
  console.error("Failed to connect transport:", error);
  process.exit(1);
});

console.error("Slite MCP server (stdio) is running");
