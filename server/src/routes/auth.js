const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware, adminOnly } = require('../middleware/auth');
const { queryAll, queryOne, runSql, logAudit } = require('../utils/helpers');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = queryOne('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    logAudit(user.id, 'LOGIN', 'user', String(user.id), { username }, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = queryOne('SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role });
});

// List users (admin)
router.get('/users', authMiddleware, adminOnly, (req, res) => {
  const users = queryAll('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY created_at DESC');
  res.json(users);
});

// Create user (admin)
router.post('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const hash = await bcrypt.hash(password, 12);
    runSql('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username, hash, fullName, role]);

    logAudit(req.user.id, 'CREATE_USER', 'user', username, { role }, req.ip);
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin)
router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { fullName, role, isActive, password } = req.body;
    const userId = req.params.id;

    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (password) {
      const hash = await bcrypt.hash(password, 12);
      runSql('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?', [hash, userId]);
    }
    if (fullName) {
      runSql('UPDATE users SET full_name = ?, updated_at = datetime("now") WHERE id = ?', [fullName, userId]);
    }
    if (role && ['admin', 'staff'].includes(role)) {
      runSql('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?', [role, userId]);
    }
    if (isActive !== undefined) {
      runSql('UPDATE users SET is_active = ?, updated_at = datetime("now") WHERE id = ?', [isActive ? 1 : 0, userId]);
    }

    logAudit(req.user.id, 'UPDATE_USER', 'user', userId, { fullName, role, isActive }, req.ip);
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
