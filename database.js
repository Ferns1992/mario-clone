const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'mario.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let db = null;

async function initDb() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      coins_collected INTEGER DEFAULT 0,
      enemies_stomped INTEGER DEFAULT 0,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS game_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL
    )
  `);
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)`);
  
  saveDb();
  
  return db;
}

function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getPlayerByName(name) {
  const stmt = db.prepare('SELECT * FROM players WHERE name = ?');
  stmt.bind([name]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function createPlayer(name) {
  try {
    db.run('INSERT INTO players (name) VALUES (?)', [name]);
    saveDb();
    return getPlayerByName(name);
  } catch (e) {
    return getPlayerByName(name);
  }
}

function getPlayerStats(name) {
  const player = getPlayerByName(name);
  if (!player) return null;
  
  const gamesPlayed = db.exec(`SELECT COUNT(*) as count FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const highScore = db.exec(`SELECT COALESCE(MAX(score), 0) as max FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalScore = db.exec(`SELECT COALESCE(SUM(score), 0) as sum FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalCoins = db.exec(`SELECT COALESCE(SUM(coins_collected), 0) as sum FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalEnemies = db.exec(`SELECT COALESCE(SUM(enemies_stomped), 0) as sum FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  
  return {
    name: player.name,
    games_played: gamesPlayed,
    high_score: highScore,
    total_score: totalScore,
    total_coins: totalCoins,
    total_enemies: totalEnemies
  };
}

function submitScore(playerId, score, level, coins, enemies) {
  db.run('INSERT INTO scores (player_id, score, level, coins_collected, enemies_stomped) VALUES (?, ?, ?, ?, ?)',
    [playerId, score, level, coins, enemies]);
  saveDb();
  return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
}

function getTopScores(limit = 10) {
  const result = db.exec(`
    SELECT s.score, s.level, s.coins_collected, s.enemies_stomped, s.played_at, p.name
    FROM scores s
    JOIN players p ON s.player_id = p.id
    ORDER BY s.score DESC
    LIMIT ${limit}
  `);
  
  if (!result[0]) return [];
  
  return result[0].values.map(row => ({
    score: row[0],
    level: row[1],
    coins_collected: row[2],
    enemies_stomped: row[3],
    played_at: row[4],
    name: row[5]
  }));
}

function getSetting(key) {
  const result = db.exec(`SELECT setting_value FROM game_settings WHERE setting_key = '${key}'`);
  return result[0]?.values[0]?.[0] || null;
}

function setSetting(key, value) {
  db.run(`INSERT OR REPLACE INTO game_settings (setting_key, setting_value) VALUES (?, ?)`, [key, value]);
  saveDb();
}

function getAllSettings() {
  const result = db.exec('SELECT setting_key, setting_value FROM game_settings');
  if (!result[0]) return [];
  return result[0].values.map(row => ({
    setting_key: row[0],
    setting_value: row[1]
  }));
}

module.exports = {
  initDb,
  saveDb,
  players: {
    create: createPlayer,
    get: getPlayerByName,
    getStats: getPlayerStats
  },
  scores: {
    submit: submitScore,
    getTop: getTopScores
  },
  settings: {
    get: getSetting,
    set: setSetting,
    getAll: getAllSettings
  }
};
