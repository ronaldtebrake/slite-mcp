#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { SliteApiClient, SliteNote, SliteSearchResult } from './sliteApi.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Check if API key is available
if (!process.env.SLITE_API_KEY) {
  console.error("ERROR: SLITE_API_KEY is not set in .env file");
  process.exit(1);
}

class SliteServer {
  private server: Server;
  private sliteClient: SliteApiClient;

  constructor() {
    this.server = new Server(
      {
        name: 'slite-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize Slite API client
    this.sliteClient = new SliteApiClient(process.env.SLITE_API_KEY!);

    // Set up request handlers
    this.setupResourceHandlers();
    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'slite://notes',
          name: 'All notes',
          description: 'List of all Slite notes',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'slite://notes/{noteId}',
            name: 'Note by ID',
            description: 'Get a specific Slite note by ID',
          },
        ],
      })
    );

    // Read resource
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        const uri = request.params.uri;
        const match = uri.match(/^slite:\/\/notes(?:\/([^/]+))?$/);
        
        if (!match) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Invalid URI format: ${uri}`
          );
        }
        
        const noteId = match[1];
        
        try {
          if (noteId) {
            // Get a specific note
            const note = await this.sliteClient.getNote(noteId);
            return {
              contents: [{
                uri,
                title: note.title,
                text: note.markdown || JSON.stringify(note, null, 2)
              }]
            };
          } else {
            // List all notes (mock implementation)
            // In a real implementation, you would fetch all notes from Slite
            // For now, we'll just return a message
            return {
              contents: [{
                uri,
                title: 'All Notes',
                text: 'This would list all notes from Slite. In a real implementation, you would fetch all notes from the Slite API.'
              }]
            };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to fetch note information: ${errorMessage}`
          );
        }
      }
    );
  }

  private setupToolHandlers() {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search-notes',
          description: 'Search for notes in Slite',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'create-note',
          description: 'Create a new note in Slite',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Note title',
              },
              markdown: {
                type: 'string',
                description: 'Note content in markdown format',
              },
              parentNoteId: {
                type: 'string',
                description: 'Parent note ID',
              },
              templateId: {
                type: 'string',
                description: 'Template ID to use',
              },
              attributes: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Note attributes',
              },
            },
            required: ['title', 'markdown'],
          },
        },
        {
          name: 'update-note',
          description: 'Update an existing note in Slite',
          inputSchema: {
            type: 'object',
            properties: {
              noteId: {
                type: 'string',
                description: 'Note ID to update',
              },
              title: {
                type: 'string',
                description: 'New note title',
              },
              markdown: {
                type: 'string',
                description: 'New note content in markdown format',
              },
              parentNoteId: {
                type: 'string',
                description: 'New parent note ID',
              },
              attributes: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'New note attributes',
              },
            },
            required: ['noteId'],
          },
        },
        {
          name: 'get-ask-info',
          description: 'Get Slite Ask information',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get-ask-index',
          description: 'Get Slite Ask index information',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get-automation-assistant',
          description: 'Get automation assistant information',
          inputSchema: {
            type: 'object',
            properties: {
              assistantId: {
                type: 'string',
                description: 'Assistant ID to retrieve',
              },
            },
            required: ['assistantId'],
          },
        },
      ],
    }));

    // Call tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search-notes': {
            const { query, limit = 10 } = args as { query: string; limit?: number };
            const results = await this.sliteClient.searchNotes(query, limit);
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Search results for "${query}":\n\n${
                    results.map(item => 
                      `- ${item.title}: ${item.snippet || 'No snippet available'} (${item.type})`
                    ).join('\n')
                  }`
                }
              ]
            };
          }
          
          case 'create-note': {
            const { title, markdown, parentNoteId, templateId, attributes } = 
              args as { title: string; markdown: string; parentNoteId?: string; templateId?: string; attributes?: string[] };
            
            const note = await this.sliteClient.createNote(title, markdown, parentNoteId, templateId, attributes);
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Note created successfully!\nTitle: ${note.title}\nID: ${note.id}`
                }
              ]
            };
          }
          
          case 'update-note': {
            const { noteId, title, markdown, parentNoteId, attributes } = 
              args as { noteId: string; title?: string; markdown?: string; parentNoteId?: string; attributes?: string[] };
            
            if (!title && !markdown && !parentNoteId && !attributes) {
              return {
                content: [{ type: 'text', text: 'You must provide at least one field to update.' }]
              };
            }
            
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
            
            const note = await this.sliteClient.updateNote(noteId, updates);
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Note updated successfully!\nTitle: ${note.title}\nID: ${note.id}`
                }
              ]
            };
          }
          
          case 'get-ask-info': {
            const askInfo = await this.sliteClient.getAskInfo();
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Slite Ask Information:\n${JSON.stringify(askInfo, null, 2)}`
                }
              ]
            };
          }
          
          case 'get-ask-index': {
            const indexInfo = await this.sliteClient.getAskIndex();
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Slite Ask Index Information:\n${JSON.stringify(indexInfo, null, 2)}`
                }
              ]
            };
          }
          
          case 'get-automation-assistant': {
            const { assistantId } = args as { assistantId: string };
            const assistant = await this.sliteClient.getAutomationAssistant(assistantId);
            
            return {
              content: [
                { 
                  type: 'text', 
                  text: `Automation Assistant Information:\n${JSON.stringify(assistant, null, 2)}`
                }
              ]
            };
          }
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Slite MCP server running on stdio');
  }
}

const server = new SliteServer();
server.run().catch(console.error);
