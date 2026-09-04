import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'groww-smart-watchlist-hackathon-2026-secret-key';

// Middleware to authenticate JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token' });
    }
    req.user = user;
    next();
  });
}

// 1-Click Judge Demo Login
router.get('/demo', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_initials, experience_level, preferred_sectors, created_at FROM users WHERE email = ?').get('demo@groww.in');
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Authenticated as Judge Demo User',
      token,
      user
    });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Internal server error during demo login' });
  }
});

// Standard Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isDemoMatch = email === 'demo@groww.in' && (password === 'groww123' || password === 'demo123');
    const isPasswordValid = isDemoMatch || bcrypt.compareSync(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_initials: user.avatar_initials,
        experience_level: user.experience_level,
        preferred_sectors: user.preferred_sectors
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Full Dedicated Registration Endpoint
router.post('/register', (req, res) => {
  try {
    const { name, email, password, experience_level, preferred_sectors } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    const expLevel = experience_level || 'Active Investor';
    const prefSectors = Array.isArray(preferred_sectors) ? preferred_sectors.join(', ') : (preferred_sectors || 'Technology, Banking');

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, avatar_initials, experience_level, preferred_sectors)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = insertUser.run(name.trim(), email.toLowerCase().trim(), passwordHash, initials, expLevel, prefSectors);
    const userId = Number(info.lastInsertRowid);

    // Auto-create personalized default watchlist
    const insertWl = db.prepare(`
      INSERT INTO watchlists (user_id, name, description, is_default)
      VALUES (?, ?, ?, 1)
    `);
    const wlInfo = insertWl.run(userId, `${name.split(' ')[0]}'s Core Radar`, `Customized for ${prefSectors}`);
    const wlId = Number(wlInfo.lastInsertRowid);

    const insertItem = db.prepare(`
      INSERT INTO watchlist_items (watchlist_id, symbol, sort_order, notes, custom_tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Dynamically pick tailored starter stocks based on preference
    const isTech = prefSectors.toLowerCase().includes('tech');
    const isAuto = prefSectors.toLowerCase().includes('auto');

    if (isTech) {
      insertItem.run(wlId, 'INFY', 0, 'Approaching Q2 catalyst with high volume', 'Tech,Catalyst');
      insertItem.run(wlId, 'TCS', 1, 'BFSI deal turnaround momentum', 'Tech,Bluechip');
      insertItem.run(wlId, 'HCLTECH', 2, 'High dividend yield tier-1 player', 'Tech,Yield');
      insertItem.run(wlId, 'ZOMATO', 3, 'Quick commerce margin inflection', 'High-Beta,Growth');
      insertItem.run(wlId, 'RELIANCE', 4, 'Index hedge & telecom anchor', 'Core');
    } else if (isAuto) {
      insertItem.run(wlId, 'TATAMOTORS', 0, 'EV volume expansion and global order book', 'EV,Auto');
      insertItem.run(wlId, 'MARUTI', 1, 'SUV segment dominance and hybrid demand', 'Auto,Core');
      insertItem.run(wlId, 'M&M', 2, 'Farm equipment and utility vehicle strength', 'Auto,Growth');
      insertItem.run(wlId, 'HDFCBANK', 3, 'Top tier private credit lender', 'Banking');
      insertItem.run(wlId, 'RELIANCE', 4, 'Conglomerate core portfolio anchor', 'Core');
    } else {
      insertItem.run(wlId, 'RELIANCE', 0, 'New energy demerger catalyst in H2', 'Core,Bluechip');
      insertItem.run(wlId, 'HDFCBANK', 1, 'Leading credit lender near support valuation', 'Banking,Value');
      insertItem.run(wlId, 'INFY', 2, 'Earnings catalyst approaching with surge volume', 'Tech,Catalyst');
      insertItem.run(wlId, 'TATAMOTORS', 3, 'Leading electric vehicle transformation', 'Auto,Growth');
      insertItem.run(wlId, 'ITC', 4, 'Defensive cash cow dividend thesis', 'FMCG,Dividend');
    }

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), name: name.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        avatar_initials: initials,
        experience_level: expLevel,
        preferred_sectors: prefSectors
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Current user profile
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_initials, experience_level, preferred_sectors, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
