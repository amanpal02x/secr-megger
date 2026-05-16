const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const Entry = require("./models/Entry");

/**
 * SECR Megger MCP Server
 * Exposes database tools to Claude
 */
const setupMCP = (app) => {
  const server = new Server(
    {
      name: "secr-megger-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_overall_summary",
          description: "Get a summary of cable health (Good/Fair/Poor/Critical) for a division or the whole project.",
          inputSchema: {
            type: "object",
            properties: {
              division: { type: "string", description: "Optional division name (e.g., Raipur, Bilaspur)" },
            },
          },
        },
        {
          name: "get_section_history",
          description: "Get the last 5 readings for a specific section to see if it is deteriorating or improving.",
          inputSchema: {
            type: "object",
            properties: {
              sectionName: { type: "string", description: "Name of the section to analyze" },
            },
            required: ["sectionName"],
          },
        },
        {
          name: "search_entries",
          description: "Search for specific cable route entries by technician or section name.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term (technician name or section)" },
            },
            required: ["query"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "get_overall_summary") {
      const division = args.division;
      let query = {};
      if (division) query.divisionName = division;

      const stats = await Entry.aggregate([
        { $match: query },
        { $group: { _id: "$condition", count: { $sum: 1 } } }
      ]);

      const topFaults = await Entry.aggregate([
        { $match: query },
        { $group: { _id: "$majorSectionName", critical: { $sum: { $cond: [{ $eq: ["$condition", "Critical"] }, 1, 0] } } } },
        { $sort: { critical: -1 } },
        { $limit: 3 }
      ]);

      return {
        content: [{ 
          type: "text", 
          text: `Summary of health: ${JSON.stringify(stats)}. Top critical areas: ${JSON.stringify(topFaults)}` 
        }],
      };
    }

    if (name === "get_section_history") {
      const sectionName = args.sectionName;
      const history = await Entry.find({ sectionName: { $regex: sectionName, $options: 'i' } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('testDate condition quadReadings');

      return {
        content: [{ 
          type: "text", 
          text: `Historical data for ${sectionName}: ${JSON.stringify(history)}` 
        }],
      };
    }

    if (name === "search_entries") {
      const queryStr = args.query.toLowerCase();
      const entries = await Entry.find({
        $or: [
          { sectionName: { $regex: queryStr, $options: 'i' } },
          { technicianName: { $regex: queryStr, $options: 'i' } }
        ]
      }).limit(10).sort({ createdAt: -1 });

      return {
        content: [{ 
          type: "text", 
          text: `Results for '${queryStr}': ${JSON.stringify(entries)}` 
        }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // --- SSE TRANSPORT SETUP ---
  let transport;

  app.get("/mcp", async (req, res) => {
    transport = new SSEServerTransport("/mcp/message", res);
    await server.connect(transport);
  });

  app.post("/mcp/message", async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(400).send("No active MCP session");
    }
  });
};

module.exports = setupMCP;
