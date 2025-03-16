# Slite MCP Server

This is a Model Context Protocol (MCP) server for Slite API integration. It allows AI assistants like Claude to interact with Slite notes.

## Features

- **Resources**:
  - `slite://notes` - List all notes
  - `slite://notes/{noteId}` - Get a specific note

- **Tools**:
  - `search-notes` - Search for notes
  - `create-note` - Create a new note
  - `update-note` - Update an existing note
  - `get-ask-info` - Get Slite Ask information
  - `get-ask-index` - Get Slite Ask index information
  - `get-automation-assistant` - Get automation assistant information

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your Slite API key:
   ```
   SLITE_API_KEY=your_slite_api_key_here
   ```
4. Build the project:
   ```
   npm run build
   ```
5. Start the server:
   ```
   npm run start
   ```

## Using with Claude

To use this MCP server with Claude, you need to add it to your Claude MCP settings:

1. Add the following configuration to your MCP settings file:
   - VSCode: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "slite": {
         "command": "node",
         "args": ["/path/to/slite-mcp-server/dist/index.js"],
         "env": {
           "SLITE_API_KEY": "your_slite_api_key_here"
         }
       }
     }
   }
   ```

2. Make sure to update the path to the server in the settings file.

3. Restart Claude or VSCode.

## Implementation

This server uses the Model Context Protocol (MCP) with a stdio transport, making it compatible with Claude and other MCP-enabled AI assistants. It provides access to Slite notes through resources and tools.

The server is implemented as a standalone executable that communicates via stdio, following the MCP specification.

## License

MIT
