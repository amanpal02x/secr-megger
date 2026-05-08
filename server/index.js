require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const Entry = require('./models/Entry');
const User = require('./models/User');
const { protect, adminOnly } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

app.use(cors());
app.use(express.json());

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Static data for dropdowns
const divisions = [
  { id: 'DIV-BPL', name: 'Bhopal Division' },
  { id: 'DIV-JBP', name: 'Jabalpur Division' },
  { id: 'DIV-NGP', name: 'Nagpur Division' },
  { id: 'DIV-BIA', name: 'Bilaspur Division' },
  { id: 'DIV-RIG', name: 'Raipur Division' },
];

const majorSections = {
  'DIV-BPL': [
    { id: 'MS-BPL-01', name: 'BPL-ET Main Line' },
    { id: 'MS-BPL-02', name: 'BPL-JHS Chord' },
    { id: 'MS-BPL-03', name: 'BPL-HBJ Suburban' },
  ],
  'DIV-JBP': [
    { id: 'MS-JBP-01', name: 'JBP-MKP Main Line' },
    { id: 'MS-JBP-02', name: 'JBP-KTE Section' },
    { id: 'MS-JBP-03', name: 'JBP-STC Branch' },
  ],
  'DIV-NGP': [
    { id: 'MS-NGP-01', name: 'NGP-WR Main Line' },
    { id: 'MS-NGP-02', name: 'NGP-CSTM Section' },
    { id: 'MS-NGP-03', name: 'NGP-BPQ Branch' },
  ],
  'DIV-BIA': [
    { id: 'MS-BIA-01', name: 'BIA-R Main Line' },
    { id: 'MS-BIA-02', name: 'BIA-C Section' },
    { id: 'MS-BIA-03', name: 'BIA-USL Branch' },
  ],
  'DIV-RIG': [
    { id: 'MS-RIG-01', name: 'RIG-DRZ Main Line' },
    { id: 'MS-RIG-02', name: 'RIG-BSP Section' },
    { id: 'MS-RIG-03', name: 'RIG-SDL Branch' },
  ],
};

const sections = {
  'MS-BPL-01': ['BPL-HBJ', 'HBJ-MIS', 'MIS-BHS', 'BHS-ET'],
  'MS-BPL-02': ['BPL-VDI', 'VDI-SHD', 'SHD-JHS'],
  'MS-BPL-03': ['BPL-SVP', 'SVP-HBJ'],
  'MS-JBP-01': ['JBP-SGO', 'SGO-KHD', 'KHD-MKP'],
  'MS-JBP-02': ['JBP-SNI', 'SNI-KTE'],
  'MS-JBP-03': ['JBP-STN', 'STN-STC'],
  'MS-NGP-01': ['NGP-SEG', 'SEG-WR'],
  'MS-NGP-02': ['NGP-ABR', 'ABR-CSTM'],
  'MS-NGP-03': ['NGP-BPQ'],
  'MS-BIA-01': ['BIA-RPHL', 'RPHL-R'],
  'MS-BIA-02': ['BIA-KRL', 'KRL-C'],
  'MS-BIA-03': ['BIA-USL'],
  'MS-RIG-01': ['RIG-DRZ'],
  'MS-RIG-02': ['RIG-BSP'],
  'MS-RIG-03': ['RIG-SDL'],
};

// GET dropdown data
app.get('/api/divisions', (req, res) => {
  res.json(divisions);
});

app.get('/api/major-sections/:divisionId', (req, res) => {
  const { divisionId } = req.params;
  const data = majorSections[divisionId] || [];
  res.json(data);
});

app.get('/api/sections/:majorSectionId', (req, res) => {
  const { majorSectionId } = req.params;
  const data = (sections[majorSectionId] || []).map((s, i) => ({
    id: `${majorSectionId}-S${i + 1}`,
    name: s,
  }));
  res.json(data);
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

// --- AUTH ROUTES --- //

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
