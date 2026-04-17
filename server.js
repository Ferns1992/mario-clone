const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = db.users.verify(username, password);
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials or account not approved' });
  }
  
  const sessionId = Math.random().toString(36).substring(2);
  sessions.set(sessionId, { 
    userId: user.id, 
    username: user.username, 
    role: user.role,
    created: Date.now() 
  });
  
  res.json({ 
    success: true, 
    token: sessionId,
    user: { username: user.username, role: user.role }
  });
});

app.post('/api/register', (req, res) => {
  const { username, password, role } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password required' });
  }
  
  if (username.length < 3 || password.length < 3) {
    return res.status(400).json({ success: false, error: 'Username and password must be at least 3 characters' });
  }
  
  const user = db.users.create(username, password, role || 'player');
  
  if (!user) {
    return res.status(400).json({ success: false, error: 'Username already exists' });
  }
  
  res.json({ success: true, message: 'Registration submitted. Waiting for admin approval.' });
});

app.use((req, res, next) => {
  const publicPaths = ['/api/login', '/api/register', '/api/health'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  const session = sessions.get(token);
  const age = Date.now() - session.created;
  const maxAge = 24 * 60 * 60 * 1000;
  
  if (age > maxAge) {
    sessions.delete(token);
    return res.status(401).json({ success: false, error: 'Session expired' });
  }
  
  session.created = Date.now();
  req.session = session;
  next();
});

function adminMiddleware(req, res, next) {
  if (req.session?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  res.json({ 
    success: true, 
    user: { username: req.session.username, role: req.session.role }
  });
});

app.get('/api/scores', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const scores = db.scores.getTop(limit);
    res.json({ success: true, scores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scores' });
  }
});

app.post('/api/scores', (req, res) => {
  try {
    const { playerName, score, level, coinsCollected, enemiesStomped } = req.body;

    if (!playerName || score === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let player = db.players.get(playerName);
    if (!player) {
      player = db.players.create(playerName, req.session.userId);
    }

    const result = db.scores.submit(
      player.id,
      score,
      level || 1,
      coinsCollected || 0,
      enemiesStomped || 0
    );

    const topScores = db.scores.getTop();
    const rank = topScores.findIndex(s => s.score === score && s.name === playerName) + 1;

    res.json({
      success: true,
      scoreId: result.lastInsertRowid,
      rank: rank > 0 ? rank : topScores.length
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    res.status(500).json({ success: false, error: 'Failed to submit scores' });
  }
});

app.get('/api/players/:name', (req, res) => {
  try {
    const stats = db.players.getStats(req.params.name);
    if (!stats) {
      return res.status(404).json({ success: false, error: 'Player not found' });
    }
    res.json({ success: true, player: stats });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch player' });
  }
});

app.get('/api/users', adminMiddleware, (req, res) => {
  try {
    const users = db.users.getAll();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.get('/api/users/pending', adminMiddleware, (req, res) => {
  try {
    const users = db.users.getPending();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending users' });
  }
});

app.post('/api/users/:id/approve', adminMiddleware, (req, res) => {
  try {
    db.users.approve(req.params.id);
    res.json({ success: true, message: 'User approved' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve user' });
  }
});

app.post('/api/users/:id/reject', adminMiddleware, (req, res) => {
  try {
    db.users.reject(req.params.id);
    res.json({ success: true, message: 'User rejected' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject user' });
  }
});

app.put('/api/users/:id/password', adminMiddleware, (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ success: false, error: 'Password must be at least 3 characters' });
    }
    db.users.updatePassword(req.params.id, newPassword);
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});

app.put('/api/users/:id/role', adminMiddleware, (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'player'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }
    db.users.updateRole(req.params.id, role);
    res.json({ success: true, message: 'Role updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const settings = db.settings.getAll();
    const settingsObj = {};
    settings.forEach(s => settingsObj[s.setting_key] = s.setting_value);
    res.json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings/:key', adminMiddleware, (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Value is required' });
    }
    db.settings.set(key, value);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  try {
    await db.initDb();
    console.log('Database initialized');
    
    app.listen(PORT, () => {
      console.log(`Mario Clone server running on port ${PORT}`);
      console.log(`Database: ${process.env.DB_PATH || 'data/mario.db'}`);
      console.log(`Default admin: ${process.env.ADMIN_USER || 'admin'} / ${process.env.ADMIN_PASS || 'admin'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
