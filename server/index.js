require('dotenv').config();
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
const setupMCP = require('./mcp');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Claude MCP
setupMCP(app);

// GET OpenAPI Spec (For ChatGPT Actions)
app.get('/api/openapi.json', (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "SECR Megger AI API",
      version: "1.0.0",
      description: "API for querying SECR Cable Route Megger data."
    },
    servers: [{ url: "https://secr-megger.onrender.com" }],
    paths: {
      "/api/ai/summary": {
        get: {
          summary: "Get health summary. Supports filtering by division, technician, and date range.",
          operationId: "getHealthSummary",
          parameters: [
            { name: "division", in: "query", schema: { type: "string" } },
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
          summary: "Search for entries by any keyword (division, section, technician) or date range",
          operationId: "searchEntries",
          parameters: [
            { name: "q", in: "query", schema: { type: "string", description: "Keywords like bsp, r, ngp, or names" } },
            { name: "division", in: "query", schema: { type: "string" } },
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
          summary: "Get a list of technicians who recently made entries, including their total entry count and last entry timestamp.",
          operationId: "getActiveUsers",
          parameters: [
            { name: "days", in: "query", schema: { type: "integer", description: "Number of days to look back (default 7)" } }
          ],
          responses: { "200": { description: "Successful response" } }
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

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Locations are now fetched from the database. 
// Use /api/locations/bulk to populate them.

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
    
    // Optional: Clear existing locations before bulk upload
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

// GET all entries (Supports AI API Key)
app.get('/api/entries', authorize, async (req, res) => {
  try {
    const { division, search, days } = req.query;
    let query = {};
    if (division) query.divisionId = division;
    
    // Non-admins only see their own entries
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.createdAt = { $gte: startDate };
    }
    
    let entries = await Entry.find(query).sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(
        e =>
          e.sectionName.toLowerCase().includes(q) ||
          (e.technicianName && e.technicianName.toLowerCase().includes(q))
      );
    }
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
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
      technicianName,
      supervisorName,
      testDate,
      attachment,
    } = req.body;

    if (!divisionId || !majorSectionId || !sectionId || !technicianName || !testDate || !attachment) {
      return res.status(400).json({ error: 'Missing required fields (including attachment)' });
    }

    // Calculate overall condition
    let worstCondition = 'Good';
    if (quadReadings && Array.isArray(quadReadings)) {
      quadReadings.forEach(q => {
        const readings = [q.insulationL1E, q.insulationL2E, q.insulationL1L2];
        readings.forEach(r => {
          if (!r) return;
          const val = parseFloat(r.replace(/[^\d.]/g, ''));
          if (isNaN(val)) return;
          
          let currentCond = 'Good';
          if (val < 1) currentCond = 'Critical';
          else if (val < 5) currentCond = 'Poor';
          else if (val < 10) currentCond = 'Fair';

          const weights = { Critical: 3, Poor: 2, Fair: 1, Good: 0 };
          if (weights[currentCond] > weights[worstCondition]) {
            worstCondition = currentCond;
          }
        });
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
      technicianName,
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

// PUT update entry
app.put('/api/entries/:id', protect, async (req, res) => {
  try {
    const entry = await Entry.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE entry
app.delete('/api/entries/:id', protect, async (req, res) => {
  try {
    const entry = await Entry.findOneAndDelete({ id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
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

    const formattedEntries = entries.map(entry => ({
      ...entry,
      id: entry.id || uuidv4(),
      userId: req.user._id,
      createdAt: new Date()
    }));

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
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const total = await Entry.countDocuments(query);
    const good = await Entry.countDocuments({ ...query, condition: 'Good' });
    const fair = await Entry.countDocuments({ ...query, condition: 'Fair' });
    const poor = await Entry.countDocuments({ ...query, condition: 'Poor' });
    const critical = await Entry.countDocuments({ ...query, condition: 'Critical' });
    res.json({ total, good, fair, poor, critical });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- AI SPECIFIC ENDPOINTS --- //

// Helper to build queries with date, user, and abbreviation filters
const buildAIQuery = (reqQuery) => {
  const { q, division, technicianName, startDate, endDate, condition } = reqQuery;
  let query = {};
  
  // Date filtering
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      let end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  // Abbreviation mapping (bsp -> bilaspur, r -> raipur, ngp -> nagpur)
  const parseKeyword = (kw) => {
    if (!kw) return kw;
    const lower = kw.toLowerCase().trim();
    if (lower === 'bsp') return 'bilaspur';
    if (lower === 'r') return 'raipur';
    if (lower === 'ngp') return 'nagpur';
    return kw;
  };

  if (division) {
    const div = parseKeyword(division).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.divisionName = { $regex: new RegExp(div, 'i') };
  }
  
  if (technicianName) {
    const tech = technicianName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.technicianName = { $regex: new RegExp(tech, 'i') };
  }

  if (condition) {
    // Condition is strict (Good, Fair, Poor, Critical)
    query.condition = { $regex: new RegExp(`^${condition}$`, 'i') };
  }

  if (q) {
    const safeQ = parseKeyword(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { sectionName: { $regex: safeQ, $options: 'i' } },
      { majorSectionName: { $regex: safeQ, $options: 'i' } },
      { divisionName: { $regex: safeQ, $options: 'i' } },
      { technicianName: { $regex: safeQ, $options: 'i' } }
    ];
  }

  return query;
};

// GET AI Summary (Aggregated data for AI insight)
app.get('/api/ai/summary', authorize, async (req, res) => {
  try {
    const query = buildAIQuery(req.query);

    // Aggregate counts by condition
    const stats = await Entry.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$condition",
          count: { $sum: 1 }
        }
      }
    ]);

    // Aggregate by major section for distribution
    const distribution = await Entry.aggregate([
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
    ]);

    res.json({
      summary: stats,
      topFaultAreas: distribution.slice(0, 5), // Top 5 areas needing attention
      filtersApplied: query,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Section Detail with History (For trend analysis)
app.get('/api/ai/section-history', authorize, async (req, res) => {
  try {
    const { sectionName } = req.query;
    if (!sectionName) return res.status(400).json({ message: 'sectionName is required' });

    const safeSection = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Fetch last 5 readings for this section
    const history = await Entry.find({ 
      $or: [
        { sectionName: { $regex: safeSection, $options: 'i' } },
        { majorSectionName: { $regex: safeSection, $options: 'i' } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('testDate condition quadReadings technicianName majorSectionName sectionName createdAt');

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Search Entries
app.get('/api/ai/search', authorize, async (req, res) => {
  try {
    const query = buildAIQuery(req.query);
    const limit = parseInt(req.query.limit) || 50;
    const finalLimit = Math.min(limit, 500); // Cap at 500 records to prevent memory crash
    
    // Safety check so we don't query the entire DB if it's completely empty
    if (Object.keys(query).length === 0) {
       return res.status(400).json({ message: 'At least one search parameter (q, division, technicianName, startDate, condition) is required' });
    }

    const entries = await Entry.find(query).limit(finalLimit).sort({ createdAt: -1 });

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
app.get('/api/ai/active-users', authorize, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7; // Default to last 7 days
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const activeUsers = await Entry.aggregate([
      { $match: { createdAt: { $gte: dateLimit } } },
      {
        $group: {
          _id: { 
            technicianName: "$technicianName", 
            divisionName: "$divisionName" 
          },
          totalEntries: { $sum: 1 },
          lastEntryDate: { $max: "$createdAt" }
        }
      },
      {
        $project: {
          _id: 0,
          technicianName: "$_id.technicianName",
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

// --- SMS UTILITY --- //
const sendSMS = async (phone, message, templateId) => {
  if (process.env.SMS_ENABLED !== 'true') {
    console.log('SMS is disabled. Message:', message);
    // Write to file for local testing in the server directory
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

    // Reviewer Bypass
    if (phoneNumber === '9667765039') {
      return res.json({ message: 'OTP sent successfully' });
    }

    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: 'Personnel not registered with this number' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

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

    // Reviewer Bypass
    if (phoneNumber === '9667765039' && otp === '120000') {
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        user = await User.create({
          phoneNumber: '9667765039',
          email: 'reviewer@megger.com',
          role: 'admin',
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

    // Reset OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    
    // Update password (pre-save hook will hash it)
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
    // Check if database is connected
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
    
    // If no users exist, the first one is an admin
    if (userCount === 0) {
      role = 'admin';
    } else {
      // Only admins can register new users via this endpoint if users already exist
      // Or we can just disable this for production and rely on Admin Portal
      // For now, let's allow it only if userCount is 0 to prevent unauthorized registrations
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

// Admin: Get all users
app.get('/api/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Admin: Create user (with password)
app.post('/api/users', protect, adminOnly, async (req, res) => {
  try {
    const { name, phoneNumber, email, password, role } = req.body;
    
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
      role: role || 'user'
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role
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
    const { name, phoneNumber, email, password, role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // pre-save hook will hash it

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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- ADMIN: API KEY MANAGEMENT --- //
// Generate/Update API Key for a user (Admin Only)
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

app.listen(PORT, () => {
  console.log(`SECR Megger Server running on http://localhost:${PORT}`);
});
