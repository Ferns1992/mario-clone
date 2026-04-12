const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      player = db.players.create(playerName);
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
    res.status(500).json({ success: false, error: 'Failed to submit score' });
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

app.post('/api/players', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    let player = db.players.get(name);
    if (!player) {
      player = db.players.create(name);
    }
    res.json({ success: true, player });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ success: false, error: 'Failed to create player' });
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

app.put('/api/settings/:key', (req, res) => {
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
