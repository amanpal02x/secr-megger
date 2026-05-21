const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const Entry = require("./models/Entry");
const User = require("./models/User");



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
          description: "Search for specific cable route entries by technician, section name, or major section.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search term (technician name, section, or major section)" },
            },
            required: ["query"],
          },
        },
        {
          name: "search_users",
          description: "Search for registered users/technicians by name, phone number, email, division, or role to view their profile details and contact number.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query (name, phone, email, etc.)" },
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
        .select('testDate condition quadReadings createdAt userId')
        .populate('userId', 'name phoneNumber');

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
          { technicianName: { $regex: queryStr, $options: 'i' } },
          { majorSectionName: { $regex: queryStr, $options: 'i' } }
        ]
      })
      .populate('userId', 'name phoneNumber email division role')
      .limit(10)
      .sort({ createdAt: -1 });

      return {
        content: [{ 
          type: "text", 
          text: `Results for '${queryStr}': ${JSON.stringify(entries)}` 
        }],
      };
    }

    if (name === "search_users") {
      const queryStr = args.query.toLowerCase();
      const users = await User.find({
        $or: [
          { name: { $regex: queryStr, $options: 'i' } },
          { phoneNumber: { $regex: queryStr, $options: 'i' } },
          { email: { $regex: queryStr, $options: 'i' } }
        ]
      }).select('name email phoneNumber role division isActive createdAt');

      return {
        content: [{ 
          type: "text", 
          text: `Results for '${queryStr}': ${JSON.stringify(users)}` 
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
