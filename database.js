const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'mario.db');

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

let db = null;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function initDb() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'player',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
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
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  
  const adminExists = db.exec("SELECT COUNT(*) FROM users WHERE role = 'admin'")[0]?.values[0][0] || 0;
  if (adminExists === 0) {
    const adminPass = process.env.ADMIN_PASS || 'admin';
    db.run("INSERT INTO users (username, password, role, status) VALUES (?, ?, 'admin', 'approved')", 
      [process.env.ADMIN_USER || 'admin', hashPassword(adminPass)]);
    console.log(`Default admin created: admin / ${adminPass}`);
  }
  
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

function getUserByUsername(username) {
  const result = db.exec(`SELECT * FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
  if (!result[0] || !result[0].values[0]) return null;
  
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const user = {};
  cols.forEach((col, i) => user[col] = vals[i]);
  return user;
}

function getUserById(id) {
  const result = db.exec(`SELECT * FROM users WHERE id = ${id}`);
  if (!result[0] || !result[0].values[0]) return null;
  
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const user = {};
  cols.forEach((col, i) => user[col] = vals[i]);
  return user;
}

function createUser(username, password, role = 'player') {
  try {
    db.run("INSERT INTO users (username, password, role, status) VALUES (?, ?, ?, 'pending')", 
      [username, hashPassword(password), role]);
    saveDb();
    return getUserByUsername(username);
  } catch (e) {
    return null;
  }
}

function approveUser(userId) {
  db.run(`UPDATE users SET status = 'approved' WHERE id = ${userId}`);
  saveDb();
}

function rejectUser(userId) {
  db.run(`DELETE FROM users WHERE id = ${userId}`);
  saveDb();
}

function updateUserPassword(userId, newPassword) {
  db.run(`UPDATE users SET password = ? WHERE id = ${userId}`, [hashPassword(newPassword)]);
  saveDb();
}

function updateUserRole(userId, newRole) {
  db.run(`UPDATE users SET role = ? WHERE id = ${userId}`, [newRole]);
  saveDb();
}

function getAllUsers() {
  const result = db.exec("SELECT id, username, role, status, created_at FROM users ORDER BY created_at DESC");
  if (!result[0]) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    username: row[1],
    role: row[2],
    status: row[3],
    created_at: row[4]
  }));
}

function getPendingUsers() {
  const result = db.exec("SELECT id, username, role, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC");
  if (!result[0]) return [];
  
  return result[0].values.map(row => ({
    id: row[0],
    username: row[1],
    role: row[2],
    created_at: row[3]
  }));
}

function verifyUser(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  if (user.password !== hashPassword(password)) return null;
  if (user.status !== 'approved') return null;
  return user;
}

function getPlayerByUserId(userId) {
  const result = db.exec(`SELECT * FROM players WHERE user_id = ${userId}`);
  if (!result[0] || !result[0].values[0]) return null;
  
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const player = {};
  cols.forEach((col, i) => player[col] = vals[i]);
  return player;
}

function getPlayerByName(name) {
  const result = db.exec(`SELECT * FROM players WHERE name = '${name.replace(/'/g, "''")}'`);
  if (!result[0] || !result[0].values[0]) return null;
  
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const player = {};
  cols.forEach((col, i) => player[col] = vals[i]);
  return player;
}

function createPlayer(name, userId = null) {
  try {
    db.run("INSERT INTO players (user_id, name) VALUES (?, ?)", [userId, name]);
    saveDb();
    return getPlayerByName(name);
  } catch (e) {
    return getPlayerByName(name);
  }
}

function getPlayerStats(name) {
  const player = getPlayerByName(name);
  if (!player) return null;
  
  const gamesPlayed = db.exec(`SELECT COUNT(*) FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const highScore = db.exec(`SELECT COALESCE(MAX(score), 0) FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalScore = db.exec(`SELECT COALESCE(SUM(score), 0) FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalCoins = db.exec(`SELECT COALESCE(SUM(coins_collected), 0) FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  const totalEnemies = db.exec(`SELECT COALESCE(SUM(enemies_stomped), 0) FROM scores WHERE player_id = ${player.id}`)[0]?.values[0][0] || 0;
  
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
  const result = db.exec(`SELECT setting_value FROM game_settings WHERE setting_key = '${key.replace(/'/g, "''")}'`);
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
  users: {
    create: createUser,
    get: getUserByUsername,
    getById: getUserById,
    getAll: getAllUsers,
    getPending: getPendingUsers,
    verify: verifyUser,
    approve: approveUser,
    reject: rejectUser,
    updatePassword: updateUserPassword,
    updateRole: updateUserRole
  },
  players: {
    create: createPlayer,
    get: getPlayerByName,
    getByUserId: getPlayerByUserId,
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
