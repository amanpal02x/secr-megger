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
const { protect, adminOnly } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// GET all entries
app.get('/api/entries', protect, async (req, res) => {
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
    } = req.body;

    if (!divisionId || !majorSectionId || !sectionId || !technicianName || !testDate) {
      return res.status(400).json({ error: 'Missing required fields' });
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

// GET stats
app.get('/api/stats', protect, async (req, res) => {
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
    const params = new URLSearchParams({
      username: process.env.SMS_USERNAME,
      password: process.env.SMS_API_PASSWORD,
      sender: process.env.SMS_SENDER_ID,
      sendto: phone,
      message: message,
      templateid: templateId,
      unicode: process.env.SMS_UNICODE || '1',
      priority: process.env.SMS_PRIORITY || '11'
    });
    
    const response = await axios.get(`${process.env.SMS_API_URL}?${params.toString()}`);
    console.log('SMS Gateway Response:', response.data);
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
    console.log(`[AUTH] OTP requested for: ${phoneNumber}`);
    if (!phoneNumber) return res.status(400).json({ message: 'Phone number required' });

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

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
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
    const { phoneNumber, email, password, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      phoneNumber,
      email,
      password,
      role: role || 'user'
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role
    });
  } catch (error) {
    console.error(error);
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

app.listen(PORT, () => {
  console.log(`SECR Megger Server running on http://localhost:${PORT}`);
});
