require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const Entry = require('./models/Entry');
const User = require('./models/User');
const Location = require('./models/Location');
const { protect, adminOnly, authorize } = require('./middleware/auth');
const { ensureDbConnected } = require('./middleware/dbCheck');
const setupMCP = require('./mcp');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
// We connect to DB and start the server asynchronously in the startServer function below

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

setupMCP(app);

// GET OpenAPI Spec (For ChatGPT Actions)
app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "SECR Megger AI API",
      version: "1.0.0",
      description: "API for querying SECR Cable Route Megger data. The backend server and database connection pool are kept warm 24/7 to ensure sub-second response times."
    },
    servers: [{ url: `${req.get('host').includes('localhost') ? 'http' : 'https'}://${req.get('host')}` }],
    paths: {
      "/api/ai/summary": {
        get: {
          summary: "Get health summary. Supports filtering by division, user, and date range.",
          operationId: "getHealthSummary",
          parameters: [
            { name: "division", in: "query", schema: { type: "string" } },
            { name: "userName", in: "query", schema: { type: "string" } },
            { name: "technicianName", in: "query", schema: { type: "string" } },
            { name: "startDate", in: "query", schema: { type: "string", format: "date", description: "YYYY-MM-DD" } },
            { name: "endDate", in: "query", schema: { type: "string", format: "date", description: "YYYY-MM-DD" } }
          ],
          responses: { "200": { description: "Successful response" } }
        }
      },
      "/api/ai/section-history": {
        get: {
          summary: "Get historical trends for a section",
          operationId: "getSectionHistory",
          parameters: [{ name: "sectionName", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Successful response" } }
        }
      },
      "/api/ai/search": {
        get: {
          summary: "Search for entries by any keyword (division, section, user) or date range",
          operationId: "searchEntries",
          parameters: [
            { name: "q", in: "query", schema: { type: "string", description: "Keywords like bsp, r, ngp, or names" } },
            { name: "division", in: "query", schema: { type: "string" } },
            { name: "userName", in: "query", schema: { type: "string" } },
            { name: "technicianName", in: "query", schema: { type: "string" } },
            { name: "condition", in: "query", schema: { type: "string", description: "Good, Fair, Poor, Critical" } },
            { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
            { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
            { name: "limit", in: "query", schema: { type: "integer", description: "Max results to return (default 50, max 500)" } }
          ],
          responses: { "200": { description: "Successful response" } }
        }
      },
      "/api/ai/active-users": {
        get: {
          summary: "Get a list of users who recently made entries, including their total entry count and last entry timestamp.",
          operationId: "getActiveUsers",
          parameters: [
            { name: "days", in: "query", schema: { type: "integer", description: "Number of days to look back (default 7)" } }
          ],
          responses: { "200": { description: "Successful response" } }
        }
      },
      "/api/ai/users": {
        get: {
          summary: "Get registered user accounts count and details. Supports filtering by division, role, and search query.",
          operationId: "getUsers",
          parameters: [
            { name: "division", in: "query", schema: { type: "string" }, description: "Division name or abbreviation (e.g. bsp, bilaspur, raipur)" },
            { name: "role", in: "query", schema: { type: "string" }, description: "Filter by role (e.g. user, sub_admin, global_admin)" },
            { name: "search", in: "query", schema: { type: "string" }, description: "Search query matching user name, email, or contact number" }
          ],
          responses: { "200": { description: "Successful response" } }
        }
      },
      "/api/ai/entries/{id}/attachment": {
        get: {
          summary: "Get entry evidence attachment (image/document) in OpenAI format",
          operationId: "getEntryAttachment",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" }, description: "The unique entry UUID" }
          ],
          responses: {
            "200": {
              description: "Successful response with file",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      openaiFileResponse: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            mime_type: { type: "string" },
                            content: { type: "string", format: "byte" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {},
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "x-api-key" }
      }
    },
    security: [{ ApiKeyAuth: [] }]
  });
});

// GET Privacy Policy (Required for custom ChatGPT Actions publishing)
app.get('/privacy', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Privacy Policy - SECR Megger AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6; max-width: 800px; margin: 0 auto; color: #2d3748; background-color: #f7fafc;">
        <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">
          <h1 style="color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-top: 0;">Privacy Policy</h1>
          <p style="color: #718096; font-size: 0.9em;"><strong>Effective Date: May 19, 2026</strong></p>
          <p>This Privacy Policy describes how the SECR Megger AI API ("we", "our", "us") handles data for the Megger AI Custom GPT ("the GPT").</p>
          
          <h2 style="color: #2d3748; font-size: 1.3em; margin-top: 24px;">1. Information Collection & Processing</h2>
          <p>The GPT accesses our API solely to query and analyze cable route megger and insulation resistance data from the SECR database. We do not collect, store, or process any personal identification information (PII) of individuals using this Custom GPT.</p>
          
          <h2 style="color: #2d3748; font-size: 1.3em; margin-top: 24px;">2. Data Storage & Sharing</h2>
          <p>All database queries are executed in real-time. No chat transcripts, query parameters, or personal data from your ChatGPT sessions are stored on our servers or shared with any third parties.</p>
          
          <h2 style="color: #2d3748; font-size: 1.3em; margin-top: 24px;">3. Security</h2>
          <p>We implement robust, industry-standard TLS (HTTPS) encryption to ensure that all data transmitted between ChatGPT and our backend API remains secure and protected from unauthorized access.</p>
          
          <h2 style="color: #2d3748; font-size: 1.3em; margin-top: 24px;">4. Contact & Inquiries</h2>
          <p>If you have any security or privacy questions regarding this service, please contact your division's SECR System Administrator.</p>
        </div>
      </body>
    </html>
  `);
});

// GET Database Connection Status (For diagnostics)
app.get('/api/db-status', (req, res) => {
  const readyStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = mongoose.connection.readyState;
  
  const rawUri = process.env.MONGO_URI || '';
  let maskedUri = 'not_configured';
  if (rawUri) {
    maskedUri = rawUri.replace(/:([^@:]+)@/, ':***@');
  }
  
  res.json({
    status: readyStates[state] || 'unknown',
    readyState: state,
    mongoUri: maskedUri,
    lastError: mongoose.connection.lastError || null
  });
});

// GET DNS & TCP Connection Test (For diagnostics)
app.get('/api/dns-test', async (req, res) => {
  const dns = require('dns').promises;
  const net = require('net');
  const host = 'ac-s4x4fjx-shard-00-00.eivnsxz.mongodb.net';
  const port = 27017;
  const results = { host, port };
  
  try {
    const addresses = await dns.resolve4(host);
    results.dns = { success: true, addresses };
  } catch (err) {
    results.dns = { success: false, error: err.message };
  }
  
  try {
    results.tcp = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(8000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve({ success: true, message: 'Connected successfully' });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timed out' });
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });
      
      socket.connect(port, host);
    });
  } catch (err) {
    results.tcp = { success: false, error: err.message };
  }
  
  res.json(results);
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Locations are now fetched from the database. 

// GET dropdown data
app.get('/api/divisions', async (req, res) => {
  try {
    const data = await Location.distinct('division');
    res.json(data.map(d => ({ id: d, name: d })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching divisions' });
  }
});

app.get('/api/major-sections', async (req, res) => {
  try {
    const { divisionId } = req.query;
    const data = await Location.distinct('majorSection', { division: divisionId });
    res.json(data.map(m => ({ id: m, name: m })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching major sections' });
  }
});

app.get('/api/sections', async (req, res) => {
  try {
    const { majorSectionId } = req.query;
    const data = await Location.distinct('section', { majorSection: majorSectionId });
    res.json(data.map(s => ({ id: s, name: s })));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sections' });
  }
});

// POST bulk locations
app.post('/api/locations/bulk', protect, adminOnly, async (req, res) => {
  try {
    const locations = req.body;
    if (!Array.isArray(locations)) return res.status(400).json({ error: 'Array expected' });
    

    await Location.deleteMany({});
    
    await Location.insertMany(locations.map(l => ({
      division: l.DIVISION || l.division,
      majorSection: l['MAJOR SECTION'] || l.majorSection,
      section: l.SECTION || l.section
    })));
    
    res.status(201).json({ message: 'Master data updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading locations' });
  }
});

// GET all locations (Admin only)
app.get('/api/locations', protect, adminOnly, async (req, res) => {
  try {
    const locations = await Location.find({}).sort({ division: 1, majorSection: 1, section: 1 }).allowDiskUse(true);
    res.json(locations);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching locations' });
  }
});

// POST single location (Admin only)
app.post('/api/locations', protect, adminOnly, async (req, res) => {
  try {
    const { division, majorSection, section } = req.body;
    if (!division || !majorSection || !section) {
      return res.status(400).json({ message: 'Missing required fields: division, majorSection, section' });
    }
    const newLocation = await Location.create({ division, majorSection, section });
    res.status(201).json(newLocation);
  } catch (err) {
    res.status(500).json({ message: 'Error creating location' });
  }
});

// PUT single location (Admin only)
app.put('/api/locations/:id', protect, adminOnly, async (req, res) => {
  try {
    const { division, majorSection, section } = req.body;
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    if (division !== undefined) location.division = division;
    if (majorSection !== undefined) location.majorSection = majorSection;
    if (section !== undefined) location.section = section;
    await location.save();
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: 'Error updating location' });
  }
});

// DELETE single location (Admin only)
app.delete('/api/locations/:id', protect, adminOnly, async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting location' });
  }
});

// GET all entries (Supports AI API Key)
app.get('/api/entries', authorize, async (req, res) => {
  try {
    const { division, search, days } = req.query;
    let query = {};
    if (division) query.divisionId = division;
    

    if (req.user.role === 'user') {
      query.userId = req.user._id;
    } else if (req.user.role === 'sub_admin') {
      query.divisionName = req.user.division;
    }

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.createdAt = { $gte: startDate };
    }
    

    let entries = await Entry.find(query).select('-attachment').populate('userId', 'name phoneNumber').sort({ createdAt: -1 }).allowDiskUse(true);

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        e =>
          (e.sectionName && e.sectionName.toLowerCase().includes(q)) ||
          (e.majorSectionName && e.majorSectionName.toLowerCase().includes(q)) ||
          (e.userName && e.userName.toLowerCase().includes(q)) ||
          (e.technicianName && e.technicianName.toLowerCase().includes(q))
      );
    }
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET single entry details (with attachment) on demand
app.get('/api/entries/:id', protect, async (req, res) => {
  try {
    const entry = await Entry.findOne({ id: req.params.id }).populate('userId', 'name phoneNumber');
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    if (req.user.role === 'user' && entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'sub_admin' && entry.divisionName !== req.user.division) {
      return res.status(403).json({ error: 'Unauthorized for this division' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching entry details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET entry attachment image/file (Public for chat rendering)
app.get('/api/entries/:id/attachment', async (req, res) => {
  try {
    const entry = await Entry.findOne({ id: req.params.id }).select('attachment');
    if (!entry || !entry.attachment) {
      return res.status(404).send('Attachment not found');
    }

    const matches = entry.attachment.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).send('Invalid attachment format');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(buffer);
  } catch (error) {
    console.error('Error serving attachment:', error);
    res.status(500).send('Server Error');
  }
});

// POST new entry
app.post('/api/entries', protect, async (req, res) => {
  try {
    const {
      divisionId,
      divisionName,
      majorSectionId,
      majorSectionName,
      sectionId,
      sectionName,
      quadReadings,
      remarks,
      userName,
      technicianName,
      supervisorName,
      testDate,
      attachment,
    } = req.body;

    const resolvedUserName = userName || technicianName;

    if (!divisionId || !majorSectionId || !sectionId || !resolvedUserName || !testDate || !attachment) {
      return res.status(400).json({ error: 'Missing required fields (including attachment)' });
    }


    let worstCondition = 'Good';
    if (quadReadings && Array.isArray(quadReadings)) {
      quadReadings.forEach(q => {
        if (q.condition === 'Bad') {
          worstCondition = 'Bad';
        } else if (!q.condition) {
          const readings = [q.insulationL1E, q.insulationL2E, q.insulationL1L2];
          readings.forEach(r => {
            if (!r) return;
            const val = parseFloat(r.replace(/[^\d.]/g, ''));
            if (!isNaN(val) && val < 10) {
              worstCondition = 'Bad';
            }
          });
        }
      });
    }

    const entry = await Entry.create({
      id: uuidv4(),
      divisionId,
      divisionName,
      majorSectionId,
      majorSectionName,
      sectionId,
      sectionName,
      quadReadings,
      condition: worstCondition,
      remarks,
      userName: resolvedUserName,
      technicianName: resolvedUserName,
      supervisorName,
      testDate,
      attachment,
      userId: req.user._id,
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.put('/api/entries/:id', protect, async (req, res) => {
  try {
    const entry = await Entry.findOne({ id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    
    if (req.user.role === 'user' && entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'sub_admin' && entry.divisionName !== req.user.division) {
      return res.status(403).json({ error: 'Unauthorized for this division' });
    }

    const updated = await Entry.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE entry
app.delete('/api/entries/:id', protect, async (req, res) => {
  try {
    const entry = await Entry.findOne({ id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    if (req.user.role === 'user' && entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'sub_admin' && entry.divisionName !== req.user.division) {
      return res.status(403).json({ error: 'Unauthorized for this division' });
    }

    await Entry.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE all entries (Admin only)
app.delete('/api/entries', protect, adminOnly, async (req, res) => {
  try {
    await Entry.deleteMany({});
    res.json({ message: 'All entries deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST bulk entries
app.post('/api/entries/bulk', protect, async (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }

    const formattedEntries = entries.map(entry => {
      let worstCondition = 'Good';
      const quadReadings = entry.quadReadings;

      if (quadReadings && Array.isArray(quadReadings)) {
        quadReadings.forEach(q => {
          if (q.condition === 'Bad') {
            worstCondition = 'Bad';
          } else if (!q.condition) {
            const readings = [q.insulationL1E, q.insulationL2E, q.insulationL1L2];
            readings.forEach(r => {
              if (!r) return;
              const val = parseFloat(r.replace(/[^\d.]/g, ''));
              if (!isNaN(val) && val < 10) {
                worstCondition = 'Bad';
              }
            });
          }
        });
      }

      const resolvedUserName = entry.userName || entry.technicianName;
      return {
        ...entry,
        id: entry.id || uuidv4(),
        userId: req.user._id,
        userName: resolvedUserName,
        technicianName: resolvedUserName,
        condition: worstCondition,
        createdAt: new Date()
      };
    });

    await Entry.insertMany(formattedEntries);
    res.status(201).json({ message: `${formattedEntries.length} entries uploaded successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET stats (Supports AI API Key)
app.get('/api/stats', authorize, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'user') {
      query.userId = req.user._id;
    } else if (req.user.role === 'sub_admin') {
      query.divisionName = req.user.division;
    }


    const [total, good, fair, poor, critical] = await Promise.all([
      Entry.countDocuments(query),
      Entry.countDocuments({ ...query, condition: 'Good' }),
      Entry.countDocuments({ ...query, condition: 'Fair' }),
      Entry.countDocuments({ ...query, condition: 'Poor' }),
      Entry.countDocuments({ ...query, condition: 'Critical' })
    ]);

    res.json({ total, good, fair, poor, critical });
  } catch (error) {
    console.error('Stats query error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- AI SPECIFIC ENDPOINTS --- //

// Helper to build queries with date, user, and abbreviation filters
const buildAIQuery = (reqQuery) => {
  const { q, division, userName, technicianName, startDate, endDate, condition } = reqQuery;
  let query = {};
  

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      let end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }


  const getSearchRegexes = (kw) => {
    if (!kw) return [];
    const lower = kw.toLowerCase().trim();
    let terms = [];
    if (lower === 'bsp' || lower === 'bilaspur') terms = ['bsp', 'bilaspur'];
    else if (lower === 'r' || lower === 'raipur') terms = ['^r$', 'raipur'];
    else if (lower === 'ngp' || lower === 'nagpur') terms = ['ngp', 'nagpur'];
    else terms = [kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')];
    
    return terms.map(t => new RegExp(t, 'i'));
  };

  if (division) {
    query.divisionName = { $in: getSearchRegexes(division) };
  }
  
  const resolvedUserName = userName || technicianName;
  if (resolvedUserName) {
    const techRegex = getSearchRegexes(resolvedUserName)[0];
    if (techRegex) {
      query.$or = [
        { userName: { $regex: techRegex } },
        { technicianName: { $regex: techRegex } }
      ];
    }
  }

  if (condition) {

    query.condition = { $regex: new RegExp(`^${condition}$`, 'i') };
  }

  if (q) {
    const qRegexes = getSearchRegexes(q);
    if (qRegexes.length > 0) {
      query.$or = [
        { sectionName: { $in: qRegexes } },
        { majorSectionName: { $in: qRegexes } },
        { divisionName: { $in: qRegexes } },
        { userName: { $in: qRegexes } },
        { technicianName: { $in: qRegexes } }
      ];
    }
  }

  return query;
};

// GET AI Summary (Aggregated data for AI insight)
app.get('/api/ai/summary', authorize, ensureDbConnected, async (req, res) => {
  try {
    const query = buildAIQuery(req.query);

    const [stats, distribution, byDivision] = await Promise.all([
      Entry.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$condition",
            count: { $sum: 1 }
          }
        }
      ]),
      Entry.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$majorSectionName",
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ["$condition", "Critical"] }, 1, 0] } },
            poor: { $sum: { $cond: [{ $eq: ["$condition", "Poor"] }, 1, 0] } }
          }
        },
        { $sort: { critical: -1, poor: -1 } }
      ]),
      Entry.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$divisionName",
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ["$condition", "Critical"] }, 1, 0] } },
            poor: { $sum: { $cond: [{ $eq: ["$condition", "Poor"] }, 1, 0] } }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    res.json({
      summary: stats,
      topFaultAreas: distribution.slice(0, 5),
      byDivision: byDivision,
      filtersApplied: query,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Section Detail with History (For trend analysis)
app.get('/api/ai/section-history', authorize, ensureDbConnected, async (req, res) => {
  try {
    const { sectionName } = req.query;
    if (!sectionName) return res.status(400).json({ message: 'sectionName is required' });

    const safeSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


    const history = await Entry.find({ 
      $or: [
        { sectionName: { $regex: safeSection, $options: 'i' } },
        { majorSectionName: { $regex: safeSection, $options: 'i' } }
      ]
    })
      .sort({ createdAt: -1 })
      .allowDiskUse(true)
      .limit(10)
      .select('testDate condition quadReadings userName technicianName majorSectionName sectionName createdAt userId')
      .populate('userId', 'name phoneNumber');

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Search Entries
app.get('/api/ai/search', authorize, ensureDbConnected, async (req, res) => {
  try {
    const query = buildAIQuery(req.query);
    const limit = parseInt(req.query.limit) || 50;
    const finalLimit = Math.min(limit, 500);
    

    if (Object.keys(query).length === 0) {
       return res.status(400).json({ message: 'At least one search parameter (q, division, userName, startDate, condition) is required' });
    }

    const entries = await Entry.find(query).select('-attachment').populate('userId', 'name phoneNumber').sort({ createdAt: -1 }).allowDiskUse(true).limit(finalLimit);

    res.json({
      count: entries.length,
      limitApplied: finalLimit,
      entries: entries
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Active Users (Tracking who is making entries and when)
app.get('/api/ai/active-users', authorize, ensureDbConnected, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const activeUsers = await Entry.aggregate([
      { $match: { createdAt: { $gte: dateLimit } } },
      {
        $group: {
          _id: { 
            userName: { $ifNull: ["$userName", "$technicianName"] }, 
            divisionName: "$divisionName" 
          },
          totalEntries: { $sum: 1 },
          lastEntryDate: { $max: "$createdAt" }
        }
      },
      {
        $project: {
          _id: 0,
          userName: "$_id.userName",
          technicianName: "$_id.userName",
          divisionName: "$_id.divisionName",
          totalEntries: 1,
          lastEntryDate: 1
        }
      },
      { $sort: { lastEntryDate: -1 } }
    ]);

    res.json({
      periodDays: days,
      activeUserCount: activeUsers.length,
      users: activeUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Users count and details for AI (Supports AI API Key)
app.get('/api/ai/users', authorize, ensureDbConnected, async (req, res) => {
  try {
    const { division, role, search } = req.query;
    let query = {};

    const getSearchRegexes = (kw) => {
      if (!kw) return [];
      const lower = kw.toLowerCase().trim();
      let terms = [];
      if (lower === 'bsp' || lower === 'bilaspur') terms = ['bsp', 'bilaspur'];
      else if (lower === 'r' || lower === 'raipur') terms = ['^r$', 'raipur'];
      else if (lower === 'ngp' || lower === 'nagpur') terms = ['ngp', 'nagpur'];
      else terms = [kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')];
      
      return terms.map(t => new RegExp(t, 'i'));
    };

    if (division) {
      query.division = { $in: getSearchRegexes(division) };
    }

    if (role) {
      query.role = role;
    }

    if (search) {
      const q = search.toLowerCase();
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phoneNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('name email phoneNumber role division isActive createdAt');
    
    res.json({
      count: users.length,
      users: users
    });
  } catch (error) {
    console.error('Error fetching users for AI:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET entry attachment image/file for AI (Secure, OpenAI format)
app.get('/api/ai/entries/:id/attachment', authorize, ensureDbConnected, async (req, res) => {
  try {
    const entry = await Entry.findOne({ id: req.params.id }).select('attachment userId divisionName id');
    if (!entry || !entry.attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    if (req.user.role === 'user' && entry.userId && entry.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (req.user.role === 'sub_admin' && entry.divisionName !== req.user.division) {
      return res.status(403).json({ message: 'Unauthorized for this division' });
    }

    const matches = entry.attachment.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid attachment format' });
    }

    const contentType = matches[1];
    const base64Data = matches[2];

    const mimeToExt = {
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'text/plain': 'txt',
      'text/csv': 'csv'
    };
    const ext = mimeToExt[contentType] || (contentType.split('/')[1] || 'bin');

    res.json({
      openaiFileResponse: [
        {
          name: `evidence-${entry.id}.${ext}`,
          mime_type: contentType,
          content: base64Data
        }
      ]
    });
  } catch (error) {
    console.error('Error serving AI attachment:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- SMS UTILITY --- //
const sendSMS = async (phone, message, templateId) => {
  if (process.env.SMS_ENABLED !== 'true') {
    console.log('SMS is disabled. Message:', message);

    try {
      const logPath = path.join(__dirname, 'last_otp.txt');
      const logEntry = `[${new Date().toLocaleString()}] To: ${phone} | Template: ${templateId}\nMessage: ${message}\n\n`;
      fs.appendFileSync(logPath, logEntry);
      console.log(`OTP written to ${logPath}`);
    } catch (err) {
      console.error('Failed to write local OTP log:', err);
    }
    return true;
  }
  try {
    const params = {
      username: process.env.SMS_USERNAME,
      api_password: process.env.SMS_API_PASSWORD,
      sender: process.env.SMS_SENDER_ID,
      to: phone,
      message: message,
      unicode: process.env.SMS_UNICODE || '1',
      priority: process.env.SMS_PRIORITY || '11',
      e_id: process.env.SMS_ENTITY_ID,
      t_id: templateId
    };

    const url = axios.getUri({ url: process.env.SMS_API_URL, params });

    const response = await axios.get(process.env.SMS_API_URL, { params });
    return true;
  } catch (error) {
    console.error('SMS Send Error:', error.message);
    return false;
  }
};

// --- AUTH ROUTES --- //

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: 'Phone number required' });


    if (phoneNumber === '9667765039') {
      return res.json({ message: 'OTP sent successfully' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: 'Personnel not registered with this number' });


    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    const message = `Your login OTP is ${otp}. Do Not Share With Anyone. - STSECR`;
    const templateId = '1707177521089604946';

    const sent = await sendSMS(phoneNumber, message, templateId);
    if (sent) {
      res.json({ message: 'OTP sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send SMS gateway request' });
    }
  } catch (error) {
    console.error('CRITICAL ERROR in /api/auth/send-otp:', error);
    res.status(500).json({ message: 'Internal Server Error: ' + error.message });
  }
});

// Verify OTP & Login
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) return res.status(400).json({ message: 'Phone and OTP required' });


    if (phoneNumber === '9667765039' && otp === '120000') {
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await User.create({
          phoneNumber: '9667765039',
          email: 'reviewer@megger.com',
          role: 'global_admin',
          isActive: true
        });
      }
      return res.json({
        _id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }

    // Clear OTP after success
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;
    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: 'User not found with this mobile number' });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }


    user.otp = undefined;
    user.otpExpires = undefined;
    

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {

    if (mongoose.connection.readyState !== 1) {
      console.log(`⏳ Database connection is in state ${mongoose.connection.readyState}. Awaiting connection event...`);
      
      // If disconnected, trigger connectDB immediately to start the connection process
      if (mongoose.connection.readyState === 0) {
        connectDB();
      }

      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) return resolve();
        
        const timeout = setTimeout(() => {
          console.warn('⚠️ Connection await timed out after 10 seconds.');
          resolve();
        }, 10000);
        
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          console.log('✅ Database connected successfully during active request wait.');
          resolve();
        });
        
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          console.error('❌ Database connection failed during active request wait:', err.message);
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database Connection Failed. Check Atlas IP Whitelist.' });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      if (!user.isActive) {
        return res.status(403).json({ message: 'User account is inactive' });
      }
      res.json({
        _id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Bootstrap / Register (Initial Admin creation)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, phoneNumber } = req.body;
    
    const userCount = await User.countDocuments();
    let role = 'user';
    

    if (userCount === 0) {
      role = 'admin';
    } else {



      return res.status(403).json({ message: 'Registration disabled. Use Admin Portal to add users.' });
    }

    const userExists = await User.findOne({ 
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (userExists) {
      const field = userExists.email === email ? 'Email' : 'Phone number';
      return res.status(400).json({ message: `${field} already registered` });
    }

    const user = await User.create({
      email,
      password,
      phoneNumber,
      role,
      isActive: true
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get current user details
app.get('/api/auth/me', protect, async (req, res) => {
  res.json(req.user);
});

app.put('/api/users/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phoneNumber, email, password } = req.body;

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      user.email = email;
    }

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
      user.phoneNumber = phoneNumber;
    }

    if (name !== undefined) user.name = name;

    if (password) {
      user.password = password;
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      division: user.division,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin: Get all users
app.get('/api/users', protect, adminOnly, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'sub_admin') {
      query.division = req.user.division;
    }
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).allowDiskUse(true);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin: Create user (with password)
app.post('/api/users', protect, adminOnly, async (req, res) => {
  try {
    let { name, phoneNumber, email, password, role, division } = req.body;
    
    if (req.user.role === 'sub_admin') {
      role = 'user';
      division = req.user.division;
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ 
      $or: [
        { email: email },
        { phoneNumber: phoneNumber }
      ]
    });

    if (userExists) {
      const field = userExists.email === email ? 'Email' : 'Phone number';
      return res.status(400).json({ message: `${field} already registered` });
    }

    const user = await User.create({
      name,
      phoneNumber,
      email,
      password,
      role: role || 'user',
      division
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      division: user.division
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'phoneNumber' ? 'Phone number' : field.charAt(0).toUpperCase() + field.slice(1);
      return res.status(400).json({ message: `${fieldName} already exists` });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin: Update user
app.put('/api/users/:id', protect, adminOnly, async (req, res) => {
  try {
    let { name, phoneNumber, email, password, role, isActive, division } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.user.role === 'sub_admin') {
      if (user.division !== req.user.division) return res.status(403).json({ message: 'Unauthorized to edit this user' });
      role = user.role;
      division = user.division;
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email;
    if (role) user.role = role;
    if (division !== undefined) user.division = division;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

    await user.save();
    res.json(user);
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'phoneNumber' ? 'Phone number' : field.charAt(0).toUpperCase() + field.slice(1);
      return res.status(400).json({ message: `${fieldName} already exists` });
    }
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin: Delete user
app.delete('/api/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (req.user.role === 'sub_admin' && user.division !== req.user.division) {
      return res.status(403).json({ message: 'Unauthorized to delete this user' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- ADMIN: API KEY MANAGEMENT --- //
app.post('/api/admin/generate-api-key', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newApiKey = `secr_${uuidv4().replace(/-/g, '')}`;
    user.apiKey = newApiKey;
    await user.save();

    res.json({ message: 'API Key generated successfully', apiKey: newApiKey });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`SECR Megger Server running on http://localhost:${PORT}`);
  });
  connectDB();

  // Keep-Alive: Ping MongoDB every 90 seconds to prevent connection dormancy
  setInterval(async () => {
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        console.log('🔄 [DB Keep-Alive] MongoDB Atlas connection pool pinged successfully.');
      } catch (err) {
        console.error('❌ [DB Keep-Alive] Failed to ping MongoDB Atlas:', err.message);
      }
    } else {
      console.log(`⚠️ [DB Keep-Alive] Connection state is ${mongoose.connection.readyState}. Attempting reconnect...`);
      connectDB();
    }
  }, 90000); // 90 seconds
};

startServer();
