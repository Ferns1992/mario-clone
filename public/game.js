const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const API_URL = window.location.origin;

const TILE_SIZE = 32;
const GRAVITY = 0.55;
const JUMP_FORCE = -12.5;
const MOVE_SPEED = 4.2;
const MAX_FALL_SPEED = 11;

let gameState = 'menu';
let score = 0;
let coins = 0;
let lives = 3;
let level = 1;
let enemiesStomped = 0;
let playerName = '';
let scrollOffset = 0;
let levelWidth = 2400;
let animationFrame = 0;
let cameraX = 0;
let particles = [];
let clouds = [];
let bushes = [];
let pipes = [];
let audioContext = null;
let musicPlaying = false;
let soundEnabled = true;
let musicEnabled = true;
let authToken = localStorage.getItem('mario_token') || null;
let currentUser = JSON.parse(localStorage.getItem('mario_user') || 'null');

const keys = {
  left: false,
  right: false,
  up: false,
  space: false,
  prevLeft: false,
  prevRight: false,
  prevUp: false,
  prevSpace: false
};

const player = {
  x: 50,
  y: 300,
  width: 24,
  height: 32,
  vx: 0,
  vy: 0,
  onGround: false,
  facingRight: true,
  isBig: false,
  isSmall: true,
  walkFrame: 0,
  walkTimer: 0,
  jumpFrame: 0,
  invincible: false,
  invincibleTimer: 0,
  dying: false,
  deathTimer: 0,
  flagpoleSlide: false,
  running: false,
  wasOnGround: false,
  jumpHeld: false,
  groundPound: false,
  coyoteTime: 0,
  jumpBufferTime: 0
};

let platforms = [];
let coinsArray = [];
let enemies = [];
let powerups = [];
let flag = null;
let blocks = [];
let enemiesOnScreen = 0;
let marioHeadColor = '#E52521';
let marioShirtColor = '#E52521';
let marioOverallsColor = '#0000AA';
let marioSkinColor = '#F4A460';

const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const scoresOverlay = document.getElementById('scores-overlay');
const levelCompleteOverlay = document.getElementById('level-complete-overlay');

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playNote(freq, duration, type = 'square', volume = 0.1, delay = 0) {
  if (!audioContext || !soundEnabled) return;
  
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioContext.currentTime + delay);
  
  gain.gain.setValueAtTime(volume, audioContext.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + delay + duration);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.start(audioContext.currentTime + delay);
  osc.stop(audioContext.currentTime + delay + duration);
}

function playJumpSound() {
  if (!soundEnabled) return;
  playNote(400, 0.1, 'square', 0.08);
  playNote(500, 0.1, 'square', 0.08, 0.05);
  playNote(600, 0.15, 'square', 0.08, 0.1);
}

function playSmallJumpSound() {
  if (!soundEnabled) return;
  playNote(300, 0.08, 'square', 0.06);
  playNote(450, 0.1, 'square', 0.06, 0.05);
}

function playCoinSound() {
  if (!soundEnabled) return;
  playNote(988, 0.1, 'square', 0.08);
  playNote(1319, 0.15, 'square', 0.1, 0.08);
  playNote(1568, 0.2, 'square', 0.08, 0.15);
}

function playStompSound() {
  if (!soundEnabled) return;
  playNote(400, 0.05, 'square', 0.1);
  playNote(200, 0.15, 'square', 0.15, 0.03);
}

function playPowerupSound() {
  if (!soundEnabled) return;
  const notes = [523, 659, 784, 1047];
  notes.forEach((note, i) => {
    playNote(note, 0.15, 'square', 0.08, i * 0.1);
  });
}

function playBumpSound() {
  if (!soundEnabled) return;
  playNote(100, 0.15, 'square', 0.1);
  playNote(80, 0.1, 'square', 0.08, 0.05);
}

function playBrickBreakSound() {
  if (!soundEnabled) return;
  for (let i = 0; i < 5; i++) {
    playNote(200 + Math.random() * 200, 0.1, 'square', 0.05, i * 0.03);
  }
}

function playDeathSound() {
  if (!soundEnabled) return;
  const notes = [659, 622, 587, 554, 523, 494, 466, 440, 392];
  notes.forEach((note, i) => {
    playNote(note, 0.2, 'square', 0.1, i * 0.2);
  });
}

function playLevelCompleteSound() {
  if (!soundEnabled) return;
  const melody = [659, 659, 659, 523, 659, 784, 392, 523, 392, 330, 440, 494, 466, 523, 659, 784, 523, 392, 784, 659];
  const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.3, 0.3, 0.3, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.3, 0.3, 0.3, 0.15, 0.3];
  let time = 0;
  melody.forEach((note, i) => {
    playNote(note, durations[i], 'square', 0.08, time);
    time += durations[i];
  });
}

function playGameOverSound() {
  if (!soundEnabled) return;
  const notes = [523, 490, 440, 392, 370, 330, 294, 262];
  notes.forEach((note, i) => {
    playNote(note, 0.4, 'square', 0.1, i * 0.4);
  });
}

function playOneUpSound() {
  if (!soundEnabled) return;
  const notes = [523, 587, 659, 698, 784, 880, 988, 1047, 1047, 1047];
  notes.forEach((note, i) => {
    playNote(note, 0.1, 'square', 0.08, i * 0.08);
  });
}

function playPipeSound() {
  if (!soundEnabled) return;
  playNote(200, 0.3, 'sine', 0.15);
}

function playWarningSound() {
  if (!soundEnabled) return;
  playNote(440, 0.2, 'square', 0.1);
  playNote(0, 0.1, 'square', 0, 0.2);
  playNote(440, 0.2, 'square', 0.1, 0.3);
}

let mainMusicInterval = null;
let undergroundMusicInterval = null;

function playMainMusic() {
  if (!audioContext || !musicEnabled || musicPlaying) return;
  stopMusic();
  musicPlaying = true;
  
  const melody = [
    { note: 659, dur: 0.2 }, { note: 659, dur: 0.2 }, { note: 0, dur: 0.2 },
    { note: 659, dur: 0.2 }, { note: 0, dur: 0.2 }, { note: 523, dur: 0.2 },
    { note: 659, dur: 0.4 }, { note: 784, dur: 0.4 }, { note: 0, dur: 0.4 },
    { note: 392, dur: 0.4 }, { note: 0, dur: 0.4 }
  ];
  
  let noteIndex = 0;
  let time = 0;
  
  mainMusicInterval = setInterval(() => {
    if (!musicEnabled || gameState !== 'playing') {
      stopMusic();
      return;
    }
    
    const note = melody[noteIndex];
    if (note.note > 0) {
      playNote(note.note, note.dur * 0.9, 'square', 0.04);
    }
    
    time += note.dur;
    noteIndex = (noteIndex + 1) % melody.length;
  }, 300);
}

function playUndergroundMusic() {
  if (!audioContext || !musicEnabled || musicPlaying) return;
  stopMusic();
  musicPlaying = true;
  
  const melody = [
    { note: 196, dur: 0.3 }, { note: 0, dur: 0.15 },
    { note: 262, dur: 0.15 }, { note: 294, dur: 0.15 },
    { note: 330, dur: 0.3 }, { note: 0, dur: 0.15 },
    { note: 349, dur: 0.15 }, { note: 330, dur: 0.15 },
    { note: 294, dur: 0.3 }, { note: 262, dur: 0.3 },
    { note: 196, dur: 0.3 }, { note: 0, dur: 0.15 },
    { note: 330, dur: 0.15 }, { note: 392, dur: 0.15 },
    { note: 294, dur: 0.3 }, { note: 0, dur: 0.15 },
    { note: 262, dur: 0.15 }, { note: 220, dur: 0.15 },
    { note: 196, dur: 0.3 }, { note: 0, dur: 0.15 }
  ];
  
  let noteIndex = 0;
  
  undergroundMusicInterval = setInterval(() => {
    if (!musicEnabled || gameState !== 'playing') {
      stopMusic();
      return;
    }
    
    const note = melody[noteIndex];
    if (note.note > 0) {
      playNote(note.note, note.dur * 0.9, 'sawtooth', 0.03);
    }
    
    noteIndex = (noteIndex + 1) % melody.length;
  }, 250);
}

function stopMusic() {
  musicPlaying = false;
  if (mainMusicInterval) clearInterval(mainMusicInterval);
  if (undergroundMusicInterval) clearInterval(undergroundMusicInterval);
  mainMusicInterval = null;
  undergroundMusicInterval = null;
}

document.getElementById('start-btn').addEventListener('click', () => {
  initAudio();
  startGame();
});
document.getElementById('scores-btn').addEventListener('click', showHighScores);
document.getElementById('restart-btn').addEventListener('click', () => {
  initAudio();
  restartGame();
});
document.getElementById('menu-btn').addEventListener('click', showMenu);
document.getElementById('back-btn').addEventListener('click', showMenu);
document.getElementById('next-level-btn').addEventListener('click', () => {
  initAudio();
  nextLevel();
});

document.getElementById('music-btn').addEventListener('click', () => {
  initAudio();
  musicEnabled = !musicEnabled;
  document.getElementById('music-btn').textContent = `MUSIC: ${musicEnabled ? 'ON' : 'OFF'}`;
  if (!musicEnabled) stopMusic();
});

document.getElementById('sound-btn').addEventListener('click', () => {
  initAudio();
  soundEnabled = !soundEnabled;
  document.getElementById('sound-btn').textContent = `SOUND: ${soundEnabled ? 'ON' : 'OFF'}`;
  if (soundEnabled) {
    playNote(523, 0.1, 'square', 0.1);
  }
});

document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('login-password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') doLogin();
});

document.getElementById('show-register').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('login-box').classList.add('hidden');
  document.getElementById('register-box').classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('register-box').classList.add('hidden');
  document.getElementById('login-box').classList.remove('hidden');
});

document.getElementById('register-btn').addEventListener('click', doRegister);
document.getElementById('reg-password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') doRegister();
});

document.getElementById('logout-btn').addEventListener('click', doLogout);

document.getElementById('admin-btn').addEventListener('click', showAdminPanel);

document.getElementById('tab-pending').addEventListener('click', () => {
  document.getElementById('tab-pending').classList.add('active');
  document.getElementById('tab-users').classList.remove('active');
  document.getElementById('pending-list').classList.remove('hidden');
  document.getElementById('users-list').classList.add('hidden');
  document.getElementById('user-edit').classList.add('hidden');
  loadPendingUsers();
});

document.getElementById('tab-users').addEventListener('click', () => {
  document.getElementById('tab-users').classList.add('active');
  document.getElementById('tab-pending').classList.remove('active');
  document.getElementById('users-list').classList.remove('hidden');
  document.getElementById('pending-list').classList.add('hidden');
  document.getElementById('user-edit').classList.add('hidden');
  loadAllUsers();
});

document.getElementById('close-admin-btn').addEventListener('click', () => {
  document.getElementById('admin-overlay').classList.add('hidden');
});

document.getElementById('save-user-btn').addEventListener('click', saveUserEdit);
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
  document.getElementById('user-edit').classList.add('hidden');
});

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    document.getElementById('login-error').textContent = 'Please enter username and password';
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (data.success) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('mario_token', authToken);
      localStorage.setItem('mario_user', JSON.stringify(currentUser));
      showGameMenu();
    } else {
      document.getElementById('login-error').textContent = data.error || 'Login failed';
      document.getElementById('login-error').classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('login-error').textContent = 'Connection error';
    document.getElementById('login-error').classList.remove('hidden');
  }
}

async function doRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  
  if (!username || !password) {
    document.getElementById('register-error').textContent = 'Please enter username and password';
    document.getElementById('register-error').classList.remove('hidden');
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('register-error').textContent = 'Registration submitted! Wait for admin approval.';
      document.getElementById('register-error').classList.remove('hidden');
      document.getElementById('register-error').style.color = '#00A800';
      setTimeout(() => {
        document.getElementById('register-box').classList.add('hidden');
        document.getElementById('login-box').classList.remove('hidden');
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('register-error').classList.add('hidden');
        document.getElementById('register-error').style.color = '';
      }, 2000);
    } else {
      document.getElementById('register-error').textContent = data.error || 'Registration failed';
      document.getElementById('register-error').classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('register-error').textContent = 'Connection error';
    document.getElementById('register-error').classList.remove('hidden');
  }
}

function doLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('mario_token');
  localStorage.removeItem('mario_user');
  document.getElementById('login-overlay').classList.remove('hidden');
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('admin-btn').classList.add('hidden');
}

async function showGameMenu() {
  document.getElementById('login-overlay').classList.add('hidden');
  document.getElementById('menu-overlay').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  if (currentUser && currentUser.role === 'admin') {
    document.getElementById('admin-btn').classList.remove('hidden');
  }
}

async function showAdminPanel() {
  document.getElementById('admin-overlay').classList.remove('hidden');
  loadPendingUsers();
}

async function loadPendingUsers() {
  try {
    const res = await fetch(`${API_URL}/api/users/pending`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    
    const list = document.getElementById('pending-list');
    if (data.users && data.users.length > 0) {
      list.innerHTML = data.users.map(u => `
        <div class="user-item">
          <div class="user-info">
            <div class="user-name">${u.username}</div>
            <div class="user-role ${u.role}">${u.role}</div>
          </div>
          <div class="user-actions">
            <button class="btn-approve" onclick="approveUser(${u.id})">Approve</button>
            <button class="btn-reject" onclick="rejectUser(${u.id})">Reject</button>
          </div>
        </div>
      `).join('');
    } else {
      list.innerHTML = '<p style="text-align: center; color: #888;">No pending users</p>';
    }
  } catch (err) {
    console.error('Error loading pending users:', err);
  }
}

async function loadAllUsers() {
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    
    const list = document.getElementById('users-list');
    if (data.users && data.users.length > 0) {
      list.innerHTML = data.users.map(u => `
        <div class="user-item">
          <div class="user-info">
            <div class="user-name">${u.username}</div>
            <div class="user-role ${u.role}">${u.role}</div>
            <div class="user-status ${u.status}">${u.status}</div>
          </div>
          <div class="user-actions">
            <button class="btn-edit" onclick="editUser(${u.id}, '${u.username}', '${u.role}')">Edit</button>
          </div>
        </div>
      `).join('');
    } else {
      list.innerHTML = '<p style="text-align: center; color: #888;">No users</p>';
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

async function approveUser(id) {
  try {
    await fetch(`${API_URL}/api/users/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    loadPendingUsers();
  } catch (err) {
    console.error('Error approving user:', err);
  }
}

async function rejectUser(id) {
  try {
    await fetch(`${API_URL}/api/users/${id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    loadPendingUsers();
  } catch (err) {
    console.error('Error rejecting user:', err);
  }
}

function editUser(id, username, role) {
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-username').textContent = username;
  document.getElementById('edit-role').value = role;
  document.getElementById('edit-new-password').value = '';
  document.getElementById('user-edit').classList.remove('hidden');
}

async function saveUserEdit() {
  const id = document.getElementById('edit-user-id').value;
  const newPassword = document.getElementById('edit-new-password').value;
  const role = document.getElementById('edit-role').value;
  
  try {
    if (newPassword) {
      await fetch(`${API_URL}/api/users/${id}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ newPassword })
      });
    }
    
    await fetch(`${API_URL}/api/users/${id}/role`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ role })
    });
    
    document.getElementById('user-edit').classList.add('hidden');
    loadAllUsers();
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

function checkAuth() {
  if (authToken && currentUser) {
    showGameMenu();
  }
}

checkAuth();

document.getElementById('playerName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    initAudio();
    startGame();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    if (!keys.left) keys.prevLeft = true;
    keys.left = true;
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    if (!keys.right) keys.prevRight = true;
    keys.right = true;
  }
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    if (!keys.up) keys.prevUp = true;
    keys.up = true;
  }
  if (e.key === ' ') {
    if (!keys.space) keys.prevSpace = true;
    keys.space = true;
    e.preventDefault();
  }
  if (e.key === 'ArrowDown') {
    player.groundPound = true;
  }
  if (e.key === 'm' || e.key === 'M') {
    musicEnabled = !musicEnabled;
    if (!musicEnabled) stopMusic();
  }
  if (e.key === 'n' || e.key === 'N') {
    soundEnabled = !soundEnabled;
  }
});

document.addEventListener('click', () => {
  initAudio();
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    keys.up = false;
    player.jumpHeld = false;
  }
  if (e.key === ' ') {
    keys.space = false;
    player.jumpHeld = false;
  }
  if (e.key === 'ArrowDown') {
    player.groundPound = false;
  }
});

function startGame() {
  initAudio();
  playerName = document.getElementById('playerName').value.trim() || 'Player';
  if (playerName.length === 0) playerName = 'Player';
  
  score = 0;
  coins = 0;
  lives = 3;
  level = 1;
  enemiesStomped = 0;
  scrollOffset = 0;
  cameraX = 0;
  particles = [];
  
  player.isBig = false;
  player.isSmall = true;
  player.height = 32;
  
  initLevel();
  gameState = 'playing';
  menuOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  levelCompleteOverlay.classList.add('hidden');
  scoresOverlay.classList.add('hidden');
  
  updateUI();
  playMainMusic();
  gameLoop();
}

function initLevel() {
  player.x = 50;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.dying = false;
  player.deathTimer = 0;
  player.invincible = false;
  player.flagpoleSlide = false;
  player.groundPound = false;
  player.coyoteTime = 0;
  player.jumpBufferTime = 0;
  player.jumpHeld = false;
  
  platforms = [];
  coinsArray = [];
  enemies = [];
  powerups = [];
  blocks = [];
  particles = [];
  clouds = [];
  bushes = [];
  pipes = [];
  
  for (let i = 0; i < 100; i++) {
    platforms.push({
      x: i * TILE_SIZE * 2,
      y: 416,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      type: 'ground'
    });
  }
  
  blocks.push({ x: 300, y: 320, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 332, y: 320, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: true, coinInside: true });
  blocks.push({ x: 500, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 532, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 700, y: 320, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 850, y: 256, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: false });
  blocks.push({ x: 882, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 914, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1000, y: 192, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1032, y: 192, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1200, y: 320, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: true });
  blocks.push({ x: 1400, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1600, y: 192, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1632, y: 192, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1664, y: 192, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 1800, y: 320, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: false });
  blocks.push({ x: 2000, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 2032, y: 256, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 2200, y: 320, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 2400, y: 256, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: true });
  blocks.push({ x: 2600, y: 320, width: 32, height: 32, type: 'brick', hit: false, bounceY: 0, hasPowerup: false });
  blocks.push({ x: 2800, y: 256, width: 32, height: 32, type: 'question', hit: false, bounceY: 0, active: true, hasPowerup: true });
  
  const coinPositions = [
    { x: 320, y: 280 }, { x: 360, y: 280 },
    { x: 520, y: 216 }, { x: 560, y: 216 },
    { x: 720, y: 280 }, { x: 760, y: 280 },
    { x: 880, y: 216 }, { x: 920, y: 216 },
    { x: 1020, y: 152 }, { x: 1060, y: 152 },
    { x: 1220, y: 280 }, { x: 1260, y: 280 },
    { x: 1420, y: 216 }, { x: 1460, y: 216 },
    { x: 1620, y: 152 }, { x: 1660, y: 152 },
    { x: 1820, y: 280 }, { x: 1860, y: 280 },
    { x: 2020, y: 216 }, { x: 2060, y: 216 },
    { x: 2220, y: 280 }, { x: 2260, y: 280 },
    { x: 2420, y: 216 }, { x: 2460, y: 216 },
    { x: 2620, y: 280 }, { x: 2660, y: 280 },
    { x: 2820, y: 216 }, { x: 2860, y: 216 }
  ];
  
  coinPositions.forEach(pos => {
    coinsArray.push({ 
      x: pos.x, 
      y: pos.y, 
      width: 24, 
      height: 28, 
      collected: false,
      bounceY: 0,
      bouncePhase: Math.random() * Math.PI * 2,
      floatOffset: Math.random() * Math.PI * 2
    });
  });
  
  const enemyPositions = [
    { x: 400, y: 384, type: 'goomba' },
    { x: 600, y: 384, type: 'goomba' },
    { x: 900, y: 384, type: 'goomba' },
    { x: 1100, y: 384, type: 'koopa' },
    { x: 1300, y: 384, type: 'goomba' },
    { x: 1500, y: 384, type: 'goomba' },
    { x: 1700, y: 384, type: 'koopa' },
    { x: 1900, y: 384, type: 'goomba' },
    { x: 2100, y: 384, type: 'goomba' },
    { x: 2300, y: 384, type: 'koopa' },
    { x: 2500, y: 384, type: 'goomba' },
    { x: 2700, y: 384, type: 'goomba' }
  ];
  
  enemyPositions.forEach(pos => {
    enemies.push({
      x: pos.x,
      y: pos.y,
      width: 28,
      height: 28,
      vx: -1.5,
      vy: 0,
      type: pos.type,
      alive: true,
      dead: false,
      squashTimer: 0,
      shellMode: false,
      shellMoving: false,
      shellVx: 0,
      walkFrame: 0,
      walkTimer: 0,
      bounceY: 0,
      kicked: false
    });
  });
  
  pipes.push({ x: 250, y: 352, height: 64, enterable: true });
  pipes.push({ x: 600, y: 352, height: 64, enterable: true });
  pipes.push({ x: 1100, y: 352, height: 64, enterable: false });
  pipes.push({ x: 1600, y: 352, height: 96, enterable: true });
  pipes.push({ x: 2100, y: 352, height: 64, enterable: false });
  pipes.push({ x: 2600, y: 352, height: 64, enterable: true });
  
  for (let i = 0; i < 30; i++) {
    clouds.push({
      x: i * 150 + Math.random() * 100,
      y: 30 + Math.random() * 80,
      size: 0.8 + Math.random() * 0.6,
      speed: 0.1 + Math.random() * 0.1
    });
  }
  
  for (let i = 0; i < 20; i++) {
    bushes.push({
      x: i * 150 + Math.random() * 50,
      size: 0.7 + Math.random() * 0.6
    });
  }
  
  for (let i = 0; i < 10; i++) {
    bushes.push({
      x: i * 300 + 100 + Math.random() * 50,
      size: 1.2 + Math.random() * 0.4,
      layer: 'back'
    });
  }
  
  flag = { x: levelWidth - 80, y: 224, width: 32, height: 192, reached: false };
  
  levelWidth = 3000 + (level - 1) * 400;
}

function gameLoop() {
  if (gameState !== 'playing') return;
  
  update();
  render();
  animationFrame++;
  
  requestAnimationFrame(gameLoop);
}

function update() {
  if (player.dying) {
    player.deathTimer++;
    player.vy += 0.5;
    player.y += player.vy;
    if (player.deathTimer > 60) {
      playerDieComplete();
    }
    return;
  }
  
  if (player.invincible) {
    player.invincibleTimer++;
    if (player.invincibleTimer > 180) {
      player.invincible = false;
      player.invincibleTimer = 0;
    }
  }
  
  if (player.flagpoleSlide) {
    player.vy = 6;
    player.y += player.vy;
    if (player.y > 350) {
      player.flagpoleSlide = false;
      playLevelCompleteSound();
      levelComplete();
    }
    return;
  }
  
  player.wasOnGround = player.onGround;
  
  player.running = keys.left || keys.right;
  
  if (keys.left) {
    if (player.vx > 0) {
      player.vx -= 1.0;
    } else {
      player.vx -= 0.4;
    }
    if (player.vx < -MOVE_SPEED) player.vx = -MOVE_SPEED;
    player.facingRight = false;
    if (player.onGround) {
      player.walkTimer++;
      const walkSpeed = player.running ? 5 : 8;
      if (player.walkTimer > walkSpeed) {
        player.walkTimer = 0;
        player.walkFrame = (player.walkFrame + 1) % 4;
      }
    }
  } else if (keys.right) {
    if (player.vx < 0) {
      player.vx += 1.0;
    } else {
      player.vx += 0.4;
    }
    if (player.vx > MOVE_SPEED) player.vx = MOVE_SPEED;
    player.facingRight = true;
    if (player.onGround) {
      player.walkTimer++;
      const walkSpeed = player.running ? 5 : 8;
      if (player.walkTimer > walkSpeed) {
        player.walkTimer = 0;
        player.walkFrame = (player.walkFrame + 1) % 4;
      }
    }
  } else {
    player.vx *= 0.85;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;
    player.walkFrame = 0;
  }
  
  if (player.onGround) {
    player.coyoteTime = 6;
  } else {
    if (player.coyoteTime > 0) player.coyoteTime--;
  }
  
  if (keys.up || keys.space) {
    player.jumpBufferTime = 8;
  } else {
    if (player.jumpBufferTime > 0) player.jumpBufferTime--;
  }
  
  const canJump = player.onGround || player.coyoteTime > 0;
  const wantsToJump = (keys.up || keys.space) && !player.jumpHeld;
  
  if (wantsToJump && canJump && !player.flagpoleSlide) {
    player.vy = player.isBig ? JUMP_FORCE * 0.95 : JUMP_FORCE;
    player.onGround = false;
    player.coyoteTime = 0;
    player.jumpBufferTime = 0;
    player.jumpHeld = true;
    if (player.isBig) {
      playJumpSound();
    } else {
      playSmallJumpSound();
    }
    createParticles(player.x + 12, player.y + player.height, 5, '#8B4513');
  }
  
  if (!(keys.up || keys.space) && player.vy < -2) {
    player.vy *= 0.5;
  }
  
  if (player.groundPound && !player.onGround && player.vy > 0) {
    player.vy = 15;
    player.groundPound = false;
  }
  
  player.vy += GRAVITY;
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;
  
  player.x += player.vx;
  player.y += player.vy;
  
  player.onGround = false;
  
  platforms.forEach(platform => {
    resolveCollision(player, platform);
  });
  
  blocks.forEach(block => {
    if (resolveCollision(player, block)) {
      if (player.vy < 0 && player.y - player.vy >= block.y + block.height - 5) {
        hitBlock(block);
      }
    }
  });
  
  pipes.forEach(pipe => {
    const pipeBox = { x: pipe.x, y: pipe.y, width: 64, height: pipe.height };
    resolveCollision(player, pipeBox);
  });
  
  if (player.x < 0) player.x = 0;
  if (player.x > levelWidth - player.width) player.x = levelWidth - player.width;
  
  if (player.y > canvas.height + 100) {
    playDeathSound();
    playerDie();
  }
  
  cameraX += (player.x - 200 - cameraX) * 0.15;
  scrollOffset = cameraX;
  
  coinsArray.forEach(coin => {
    if (!coin.collected) {
      coin.bouncePhase += 0.12;
      coin.floatOffset += 0.05;
      if (checkCollision(player, coin)) {
        coin.collected = true;
        score += 200;
        coins++;
        createParticles(coin.x + 12, coin.y, 8, '#FFD700');
        playCoinSound();
        updateUI();
      }
    }
  });
  
  enemiesOnScreen = 0;
  enemies.forEach(enemy => {
    if (enemy.dead) return;
    
    const onScreen = enemy.x > cameraX - 50 && enemy.x < cameraX + canvas.width + 50;
    if (onScreen) enemiesOnScreen++;
    
    if (enemy.squashTimer > 0) {
      enemy.squashTimer--;
      return;
    }
    
    if (enemy.shellMode && !enemy.shellMoving) {
      return;
    }
    
    if (onScreen) {
      enemy.vx = enemy.shellMoving ? enemy.shellVx : -1.5;
      enemy.x += enemy.vx;
      enemy.walkTimer++;
      if (enemy.walkTimer > 10) {
        enemy.walkTimer = 0;
        enemy.walkFrame = (enemy.walkFrame + 1) % 2;
      }
    }
    
    let onPlatform = false;
    platforms.forEach(platform => {
      if (enemy.x < platform.x + platform.width &&
          enemy.x + enemy.width > platform.x &&
          enemy.y + enemy.height >= platform.y &&
          enemy.y + enemy.height <= platform.y + 15) {
        enemy.y = platform.y - enemy.height;
        enemy.vy = 0;
        onPlatform = true;
      }
    });
    
    if (!onPlatform) {
      enemy.vy += GRAVITY;
    }
    enemy.y += enemy.vy;
    if (enemy.y > 400) enemy.y = 400;
    
    pipes.forEach(pipe => {
      if (enemy.x + enemy.width > pipe.x && enemy.x < pipe.x + 64 &&
          enemy.y + enemy.height >= pipe.y && enemy.y + enemy.height <= pipe.y + 15) {
        enemy.y = pipe.y - enemy.height;
        enemy.vy = 0;
        if (enemy.x < pipe.x + 32) {
          enemy.x = pipe.x - enemy.width;
          if (!enemy.shellMode) enemy.vx = 1.5;
        } else {
          enemy.x = pipe.x + 64;
          if (!enemy.shellMode) enemy.vx = -1.5;
        }
      }
    });
    
    if (enemy.x <= 0) {
      enemy.x = 0;
      enemy.vx *= -1;
    }
    if (enemy.x >= levelWidth - enemy.width) {
      enemy.x = levelWidth - enemy.width;
      enemy.vx *= -1;
    }
    
    if (onScreen && checkCollision(player, enemy)) {
      if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2 + 15 && !enemy.shellMode && !enemy.kicked) {
        enemy.alive = false;
        enemy.squashTimer = 30;
        enemy.dead = true;
        player.vy = JUMP_FORCE * 0.6;
        score += 100;
        enemiesStomped++;
        createParticles(enemy.x + 14, enemy.y, 5, '#8B4513');
        playStompSound();
        updateUI();
      } else if (enemy.shellMode && !enemy.shellMoving) {
        enemy.shellMoving = true;
        enemy.shellVx = player.x < enemy.x ? 8 : -8;
        playKickSound();
      } else if (enemy.shellMoving || enemy.kicked) {
        if (!player.invincible) {
          playDeathSound();
          playerDie();
        }
      } else {
        if (!player.invincible) {
          if (player.isBig) {
            playPowerdownSound();
            player.shrink();
          } else {
            playDeathSound();
            playerDie();
          }
        }
      }
    }
  });
  
  powerups.forEach((powerup, index) => {
    powerup.vy += GRAVITY * 0.25;
    powerup.y += powerup.vy;
    powerup.x += powerup.vx;
    powerup.animFrame = (powerup.animFrame || 0) + 0.15;
    
    let onGround = false;
    platforms.forEach(platform => {
      if (powerup.x + powerup.width > platform.x && powerup.x < platform.x + platform.width &&
          powerup.y + powerup.height >= platform.y && powerup.y + powerup.height <= platform.y + 15) {
        powerup.y = platform.y - powerup.height;
        powerup.vy = 0;
        onGround = true;
      }
    });
    
    if (onGround && Math.abs(powerup.vx) < 0.5) {
      powerup.vx = 1;
    }
    
    pipes.forEach(pipe => {
      if (powerup.x + powerup.width > pipe.x && powerup.x < pipe.x + 64 &&
          powerup.y + powerup.height > pipe.y) {
        powerup.vx *= -1;
        powerup.x += powerup.vx * 3;
      }
    });
    
    if (checkCollision(player, powerup)) {
      if (powerup.type === 'mushroom') {
        if (player.isSmall) {
          player.isBig = true;
          player.isSmall = false;
          player.height = 48;
          player.y -= 16;
          playPowerupSound();
          createParticles(powerup.x, powerup.y, 10, '#FF0000');
        }
        powerups.splice(index, 1);
      } else if (powerup.type === 'fireflower') {
        player.isBig = true;
        player.isSmall = false;
        player.height = 48;
        player.y -= 16;
        playPowerupSound();
        createParticles(powerup.x, powerup.y, 10, '#FF4500');
        powerups.splice(index, 1);
      } else if (powerup.type === 'star') {
        player.invincible = true;
        player.invincibleTimer = 0;
        playOneUpSound();
        createParticles(powerup.x, powerup.y, 15, '#FFD700');
        powerups.splice(index, 1);
      }
      updateUI();
    }
  });
  
  blocks.forEach(block => {
    if (block.hit && block.bounceY < 0) {
      block.bounceY += 1.5;
      if (block.bounceY > 0) block.bounceY = 0;
    } else if (block.hit && block.bounceY > 0) {
      block.bounceY *= 0.7;
      if (block.bounceY < 0.5) block.bounceY = 0;
    }
  });
  
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  });
  
  clouds.forEach(cloud => {
    cloud.x += cloud.speed;
    if (cloud.x > levelWidth + 100) cloud.x = cameraX - 100;
  });
  
  if (flag && !flag.reached && checkCollision(player, flag)) {
    flag.reached = true;
    player.flagpoleSlide = true;
    player.vx = 0;
    player.vy = 0;
    stopMusic();
  }
}

function playKickSound() {
  playNote(300, 0.1, 'square', 0.1);
  playNote(200, 0.15, 'square', 0.1, 0.05);
}

function playPowerdownSound() {
  playNote(200, 0.2, 'square', 0.1);
  playNote(150, 0.3, 'square', 0.1, 0.15);
}

function resolveCollision(entity, obstacle) {
  if (!checkCollision(entity, obstacle)) return false;
  
  const overlapX = Math.min(entity.x + entity.width - obstacle.x, obstacle.x + obstacle.width - entity.x);
  const overlapY = Math.min(entity.y + entity.height - obstacle.y, obstacle.y + obstacle.height - entity.y);
  
  if (overlapX < overlapY) {
    if (entity.x < obstacle.x) {
      entity.x = obstacle.x - entity.width;
    } else {
      entity.x = obstacle.x + obstacle.width;
    }
    entity.vx = 0;
  } else {
    if (entity.y < obstacle.y) {
      entity.y = obstacle.y - entity.height;
      entity.vy = 0;
      entity.onGround = true;
    } else {
      entity.y = obstacle.y + obstacle.height;
      entity.vy = 0;
    }
  }
  
  return true;
}

function hitBlock(block) {
  if (block.type === 'question') {
    block.hit = true;
    block.bounceY = -8;
    
    if (block.coinInside) {
      coins++;
      score += 200;
      playCoinSound();
      createParticles(block.x + 16, block.y - 10, 5, '#FFD700');
    } else if (block.hasPowerup && block.active) {
      block.active = false;
      if (player.isBig) {
        powerups.push({
          x: block.x,
          y: block.y - 32,
          width: 28,
          height: 28,
          vx: 1.5,
          vy: -3,
          type: 'fireflower',
          animFrame: 0
        });
      } else {
        powerups.push({
          x: block.x,
          y: block.y - 32,
          width: 28,
          height: 28,
          vx: 1.5,
          vy: -3,
          type: 'mushroom',
          animFrame: 0
        });
      }
      playPowerupSound();
    } else {
      playBumpSound();
    }
    updateUI();
  } else if (block.type === 'brick') {
    block.hit = true;
    block.bounceY = -4;
    playBumpSound();
    
    if (player.running && player.isBig) {
      setTimeout(() => {
        block.destroyed = true;
        playBrickBreakSound();
        createParticles(block.x + 16, block.y + 16, 8, '#C84C0C');
        score += 50;
        updateUI();
      }, 100);
    }
  }
}

player.shrink = function() {
  this.isBig = false;
  this.isSmall = true;
  this.height = 32;
  this.y += 16;
  this.invincible = true;
  this.invincibleTimer = 0;
};

function createParticles(x, y, count, color) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 5 - 2,
      size: 2 + Math.random() * 4,
      color: color,
      life: 25 + Math.random() * 25
    });
  }
}

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function playerDie() {
  if (player.invincible && !player.dying) return;
  
  lives--;
  player.dying = true;
  player.deathTimer = 0;
  player.vy = JUMP_FORCE;
  player.vx = 0;
  stopMusic();
  playDeathSound();
  updateUI();
}

function playerDieComplete() {
  if (lives <= 0) {
    gameOver();
  } else {
    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    player.dying = false;
    player.deathTimer = 0;
    player.invincible = true;
    player.invincibleTimer = 0;
    player.isBig = false;
    player.isSmall = true;
    player.height = 32;
    cameraX = 0;
    scrollOffset = 0;
    playMainMusic();
  }
}

async function gameOver() {
  gameState = 'gameover';
  stopMusic();
  playGameOverSound();
  document.getElementById('final-score').textContent = score;
  gameoverOverlay.classList.remove('hidden');
  
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    await fetch(`${API_URL}/api/scores`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        playerName,
        score,
        level,
        coinsCollected: coins,
        enemiesStomped: enemiesStomped
      })
    });
  } catch (err) {
    console.log('Could not save score:', err);
  }
}

function levelComplete() {
  gameState = 'levelcomplete';
  score += 2000 + (coins * 200);
  document.getElementById('level-score').textContent = score;
  levelCompleteOverlay.classList.remove('hidden');
  updateUI();
}

function nextLevel() {
  level++;
  levelCompleteOverlay.classList.add('hidden');
  initLevel();
  gameState = 'playing';
  updateUI();
  playMainMusic();
  gameLoop();
}

function restartGame() {
  score = 0;
  coins = 0;
  lives = 3;
  level = 1;
  enemiesStomped = 0;
  scrollOffset = 0;
  cameraX = 0;
  playerName = document.getElementById('playerName').value.trim() || 'Player';
  player.isBig = false;
  player.isSmall = true;
  player.height = 32;
  player.invincible = false;
  
  initLevel();
  gameState = 'playing';
  gameoverOverlay.classList.add('hidden');
  updateUI();
  playMainMusic();
  gameLoop();
}

function showMenu() {
  gameState = 'menu';
  stopMusic();
  menuOverlay.classList.remove('hidden');
  gameoverOverlay.classList.add('hidden');
  scoresOverlay.classList.add('hidden');
  levelCompleteOverlay.classList.add('hidden');
}

async function showHighScores() {
  scoresOverlay.classList.remove('hidden');
  menuOverlay.classList.add('hidden');
  
  try {
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const response = await fetch(`${API_URL}/api/scores`, { headers });
    const data = await response.json();
    
    const scoresList = document.getElementById('scores-list');
    if (data.scores && data.scores.length > 0) {
      scoresList.innerHTML = data.scores.map((s, i) => `
        <div class="score-item">
          <span class="score-rank">#${i + 1}</span>
          <span class="score-name">${s.name}</span>
          <span class="score-value">${s.score}</span>
        </div>
      `).join('');
    } else {
      scoresList.innerHTML = '<p style="text-align: center; color: #888;">No scores yet!</p>';
    }
  } catch (err) {
    document.getElementById('scores-list').innerHTML = '<p style="text-align: center; color: #888;">Could not load scores</p>';
  }
}

function updateUI() {
  document.getElementById('score').textContent = score;
  document.getElementById('coins').textContent = coins;
  document.getElementById('lives').textContent = lives;
  document.getElementById('level').textContent = level;
}

function drawCloud(x, y, size) {
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(x, y, 20 * size, 0, Math.PI * 2);
  ctx.arc(x + 25 * size, y - 10 * size, 25 * size, 0, Math.PI * 2);
  ctx.arc(x + 50 * size, y, 20 * size, 0, Math.PI * 2);
  ctx.arc(x + 25 * size, y + 5 * size, 15 * size, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(x, y, size) {
  ctx.fillStyle = '#00A800';
  ctx.beginPath();
  ctx.arc(x, y, 20 * size, Math.PI, 0);
  ctx.arc(x + 20 * size, y - 10 * size, 25 * size, Math.PI, 0);
  ctx.arc(x + 45 * size, y, 20 * size, Math.PI, 0);
  ctx.fill();
  
  ctx.fillStyle = '#008000';
  ctx.beginPath();
  ctx.arc(x + 20 * size, y - 5 * size, 10 * size, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipe(x, y, height) {
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x, y, 64, height);
  
  ctx.fillStyle = '#008000';
  ctx.fillRect(x + 4, y + 4, 8, height - 4);
  ctx.fillRect(x + 52, y + 4, 8, height - 4);
  ctx.fillRect(x + 12, y + 4, 4, height - 4);
  ctx.fillRect(x + 48, y + 4, 4, height - 4);
  
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x - 8, y, 80, 32);
  ctx.fillStyle = '#008000';
  ctx.fillRect(x - 8, y + 28, 80, 4);
  ctx.fillStyle = '#00A800';
  ctx.fillRect(x - 8, y + 32, 80, 8);
}

function drawBrick(x, y, bounceY = 0, destroyed = false) {
  if (destroyed) return;
  y += bounceY;
  
  ctx.fillStyle = '#C84C0C';
  ctx.fillRect(x, y, 32, 32);
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x, y, 32, 4);
  ctx.fillRect(x, y, 4, 32);
  ctx.fillRect(x + 14, y + 4, 4, 12);
  ctx.fillRect(x + 28, y + 4, 4, 12);
  ctx.fillRect(x + 14, y + 20, 4, 12);
  ctx.fillRect(x + 28, y + 20, 4, 12);
  
  ctx.fillStyle = '#DD8855';
  ctx.fillRect(x + 4, y + 4, 10, 12);
  ctx.fillRect(x + 18, y + 4, 10, 12);
  ctx.fillRect(x + 4, y + 20, 10, 8);
  ctx.fillRect(x + 18, y + 20, 10, 8);
}

function drawQuestionBlock(x, y, bounceY = 0, hit = false, active = true) {
  y += bounceY;
  
  if (!active) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#5C3317';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    return;
  }
  
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(x, y, 32, 32);
  
  ctx.fillStyle = '#FFA500';
  ctx.fillRect(x + 2, y + 2, 28, 28);
  
  ctx.fillStyle = '#FFE4B5';
  ctx.fillRect(x + 6, y + 6, 20, 20);
  
  ctx.fillStyle = '#000';
  ctx.font = 'bold 20px Arial';
  ctx.fillText('?', x + 8, y + 24);
}

function drawMario(x, y, facingRight, walkFrame, isBig, isJumping, invincible, isDying) {
  const flip = !facingRight;
  const height = isBig ? 48 : 32;
  
  if (invincible && Math.floor(animationFrame / 2) % 2 === 0) return;
  
  ctx.save();
  if (flip) {
    ctx.translate(x + 24, y);
    ctx.scale(-1, 1);
    x = 0;
    y = 0;
  }
  
  if (isDying) {
    ctx.fillStyle = '#E52521';
    ctx.fillRect(x + 4, y + 8, 16, 12);
    ctx.fillStyle = '#F4A460';
    ctx.fillRect(x + 6, y, 12, 10);
    ctx.fillStyle = '#E52521';
    ctx.fillRect(x, y - 2, 16, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10, y + 2, 4, 4);
    ctx.restore();
    return;
  }
  
  const bodyBob = isJumping ? -2 : (walkFrame % 2 === 1 ? 1 : 0);
  const legOffset = isJumping ? 4 : (walkFrame % 4 < 2 ? walkFrame * 2 : (4 - walkFrame) * 2);
  
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 2, y + 12 + bodyBob, 20, 14);
  
  ctx.fillStyle = '#F4A460';
  ctx.fillRect(x + 4, y + 2, 16, 12);
  
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x, y - 2, 18, 8);
  ctx.fillRect(x + 14, y, 10, 6);
  
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 14, y + 4, 4, 4);
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 15, y + 5, 2, 2);
  
  ctx.fillStyle = '#E52521';
  ctx.fillRect(x + 4, y + 14 + bodyBob, 4, 4);
  
  if (!isJumping) {
    ctx.fillStyle = '#0000AA';
    ctx.fillRect(x + 4, y + height - 8, 6, 8);
    ctx.fillRect(x + 14, y + height - 8 + legOffset, 6, 8 - legOffset);
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 4, y + height - 4, 6, 4);
    ctx.fillRect(x + 14, y + height - 4 + legOffset, 6, 4 - legOffset);
  } else {
    ctx.fillStyle = '#0000AA';
    ctx.fillRect(x + 2, y + height - 6, 8, 6);
    ctx.fillRect(x + 14, y + height - 6, 8, 6);
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 2, y + height - 3, 8, 3);
    ctx.fillRect(x + 14, y + height - 3, 8, 3);
  }
  
  ctx.restore();
}

function drawGoomba(x, y, walkFrame, dead) {
  if (dead) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, y + 18, 28, 8);
    return;
  }
  
  const bounce = walkFrame % 2 === 0 ? 0 : -2;
  
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(x + 14, y + 12 + bounce, 14, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#A0522D';
  ctx.beginPath();
  ctx.arc(x + 14, y + 10 + bounce, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 4, y + 6 + bounce, 6, 6);
  ctx.fillRect(x + 18, y + 6 + bounce, 6, 6);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6, y + 8 + bounce, 3, 3);
  ctx.fillRect(x + 20, y + 8 + bounce, 3, 3);
  
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 2, y + 20 + bounce, 8, 8);
  ctx.fillRect(x + 18, y + 20 + bounce, 8, 8);
  
  ctx.fillStyle = '#D2691E';
  ctx.fillRect(x + 4, y + 20 + bounce, 6, 4);
  ctx.fillRect(x + 18, y + 20 + bounce, 6, 4);
}

function drawKoopa(x, y, walkFrame, shellMode, shellMoving = false) {
  if (shellMode) {
    ctx.fillStyle = '#00A800';
    ctx.beginPath();
    ctx.arc(x + 14, y + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F4A460';
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10, y + 10, 8, 8);
    if (shellMoving) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(x + 10, y + 10, 8, 8);
    }
    return;
  }
  
  const bounce = walkFrame % 2 === 0 ? 0 : -2;
  
  ctx.fillStyle = '#00A800';
  ctx.beginPath();
  ctx.arc(x + 14, y + 10 + bounce, 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(x + 14, y + 8 + bounce, 8, Math.PI, 0);
  ctx.fill();
  
  ctx.fillStyle = '#FFF';
  ctx.fillRect(x + 6, y + 4 + bounce, 5, 5);
  ctx.fillRect(x + 17, y + 4 + bounce, 5, 5);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 7, y + 5 + bounce, 3, 3);
  ctx.fillRect(x + 18, y + 5 + bounce, 3, 3);
  
  ctx.fillStyle = '#F4A460';
  ctx.fillRect(x + 2, y + 18 + bounce, 8, 10);
  ctx.fillRect(x + 18, y + 18 + bounce, 8, 10);
}

function drawMushroom(x, y, animFrame) {
  const bounce = Math.abs(Math.sin(animFrame)) * 2;
  
  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.arc(x + 14, y + 12 - bounce, 14, Math.PI, 0);
  ctx.fill();
  
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(x + 6, y + 8 - bounce, 4, 0, Math.PI * 2);
  ctx.arc(x + 14, y + 6 - bounce, 4, 0, Math.PI * 2);
  ctx.arc(x + 22, y + 8 - bounce, 4, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#F4A460';
  ctx.fillRect(x + 8, y + 14 - bounce, 12, 14);
}

function drawFireFlower(x, y, animFrame) {
  const colors = ['#FF0000', '#FFFF00', '#00FF00'];
  const rotation = animFrame * 0.1;
  
  for (let i = 0; i < 5; i++) {
    const angle = rotation + (i * Math.PI * 2 / 5);
    const petalX = x + 14 + Math.cos(angle) * 8;
    const petalY = y + 12 + Math.sin(angle) * 8;
    
    ctx.fillStyle = colors[i % 3];
    ctx.beginPath();
    ctx.arc(petalX, petalY, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 10, y + 16, 8, 12);
}

function drawStar(x, y, animFrame) {
  const bounce = Math.abs(Math.sin(animFrame * 2)) * 4;
  const rotation = animFrame * 0.2;
  
  ctx.save();
  ctx.translate(x + 14, y + 14 - bounce);
  ctx.rotate(rotation);
  
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2 / 5) - Math.PI / 2;
    const outerX = Math.cos(angle) * 14;
    const outerY = Math.sin(angle) * 14;
    const innerAngle = angle + Math.PI / 5;
    const innerX = Math.cos(innerAngle) * 6;
    const innerY = Math.sin(innerAngle) * 6;
    
    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#FFF';
  ctx.fillRect(-2, -2, 4, 4);
  
  ctx.restore();
}

function drawFlag(x, y, reached) {
  const flagWave = Math.sin(animationFrame * 0.15) * 3;
  
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 12, y, 8, 192);
  
  if (reached) {
    ctx.fillStyle = '#FFD700';
  } else {
    ctx.fillStyle = '#00A800';
  }
  
  ctx.beginPath();
  ctx.moveTo(x + 20, y + 5);
  ctx.lineTo(x + 55 + flagWave, y + 25);
  ctx.lineTo(x + 20, y + 45);
  ctx.fill();
}

function drawHills(x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 40 * size, Math.PI, 0);
  ctx.arc(x + 50 * size, y, 35 * size, Math.PI, 0);
  ctx.arc(x + 95 * size, y, 45 * size, Math.PI, 0);
  ctx.fill();
}

function render() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#5C94FC');
  gradient.addColorStop(0.6, '#87CEEB');
  gradient.addColorStop(0.85, '#228B22');
  gradient.addColorStop(1, '#8B4513');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(-scrollOffset, 0);
  
  drawHills(100 - (scrollOffset * 0.1) % 300, 380, 1.5, '#00A800');
  drawHills(400 - (scrollOffset * 0.15) % 400, 390, 1.2, '#00A800');
  drawHills(800 - (scrollOffset * 0.2) % 350, 385, 1.3, '#00A800');
  
  clouds.forEach(cloud => {
    if (cloud.x - scrollOffset > -150 && cloud.x - scrollOffset < canvas.width + 150) {
      drawCloud(cloud.x, cloud.y, cloud.size);
    }
  });
  
  bushes.filter(b => b.layer === 'back').forEach(bush => {
    if (bush.x - scrollOffset > -100 && bush.x - scrollOffset < canvas.width + 100) {
      drawBush(bush.x, 380, bush.size);
    }
  });
  
  bushes.filter(b => !b.layer).forEach(bush => {
    if (bush.x - scrollOffset > -100 && bush.x - scrollOffset < canvas.width + 100) {
      drawBush(bush.x, 400, bush.size);
    }
  });
  
  pipes.forEach(pipe => {
    drawPipe(pipe.x, pipe.y, pipe.height);
  });
  
  platforms.forEach(platform => {
    if (platform.x - scrollOffset > -100 && platform.x - scrollOffset < canvas.width + 100) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(platform.x, platform.y, platform.width, 8);
      
      for (let i = 0; i < platform.width / 32; i++) {
        ctx.fillStyle = '#C84C0C';
        ctx.fillRect(platform.x + i * 32 + 1, platform.y + 9, 30, platform.height - 9);
        
        ctx.strokeStyle = '#8B4513';
        ctx.strokeRect(platform.x + i * 32 + 2, platform.y + 10, 28, 22);
        
        ctx.fillStyle = '#DD8855';
        ctx.fillRect(platform.x + i * 32 + 4, platform.y + 12, 10, 12);
        ctx.fillRect(platform.x + i * 32 + 18, platform.y + 12, 10, 12);
      }
    }
  });
  
  blocks.forEach(block => {
    if (block.x - scrollOffset > -50 && block.x - scrollOffset < canvas.width + 50) {
      if (block.type === 'brick') {
        drawBrick(block.x, block.y, block.bounceY || 0, block.destroyed);
      } else if (block.type === 'question') {
        drawQuestionBlock(block.x, block.y, block.bounceY || 0, block.hit, block.active);
      }
    }
  });
  
  coinsArray.forEach(coin => {
    if (!coin.collected && coin.x - scrollOffset > -50 && coin.x - scrollOffset < canvas.width + 50) {
      const bounce = Math.sin(coin.bouncePhase) * 3;
      const floatY = Math.sin(coin.floatOffset) * 2;
      
      const stretch = Math.abs(Math.cos(coin.bouncePhase));
      
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(coin.x + 12, coin.y + 14 + bounce + floatY, 10 * stretch, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.ellipse(coin.x + 12, coin.y + 14 + bounce + floatY, 6 * stretch, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      if (stretch > 0.5) {
        ctx.fillStyle = '#FFE4B5';
        ctx.beginPath();
        ctx.ellipse(coin.x + 10, coin.y + 10 + bounce + floatY, 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  
  enemies.forEach(enemy => {
    if (!enemy.dead && enemy.x - scrollOffset > -50 && enemy.x - scrollOffset < canvas.width + 50) {
      if (enemy.type === 'goomba') {
        drawGoomba(enemy.x, enemy.y, enemy.walkFrame, enemy.dead);
      } else if (enemy.type === 'koopa') {
        drawKoopa(enemy.x, enemy.y, enemy.walkFrame, enemy.shellMode, enemy.shellMoving);
      }
    }
  });
  
  powerups.forEach(powerup => {
    if (powerup.type === 'mushroom') {
      drawMushroom(powerup.x, powerup.y, powerup.animFrame);
    } else if (powerup.type === 'fireflower') {
      drawFireFlower(powerup.x, powerup.y, powerup.animFrame);
    } else if (powerup.type === 'star') {
      drawStar(powerup.x, powerup.y, powerup.animFrame);
    }
  });
  
  if (flag) {
    drawFlag(flag.x, flag.y, flag.reached);
  }
  
  drawMario(
    player.x, 
    player.y, 
    player.facingRight, 
    player.walkFrame,
    player.isBig,
    !player.onGround,
    player.invincible,
    player.dying
  );
  
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 50;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });
  
  ctx.restore();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, canvas.width, 30);
  
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`MARIO`, 20, 20);
  ctx.fillText(score.toString().padStart(6, '0'), 100, 20);
  
  ctx.fillText(`COINS`, canvas.width / 2 - 60, 20);
  ctx.fillText(coins.toString(), canvas.width / 2 + 30, 20);
  
  ctx.fillText(`WORLD`, canvas.width - 150, 20);
  ctx.fillText(`${level}-1`, canvas.width - 70, 20);
  
  if (player.flagpoleSlide) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level} CLEAR!`, canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    ctx.textAlign = 'left';
  }
  
  if (gameState === 'menu') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#E52521';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MARIO CLONE', canvas.width / 2, 150);
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('Press START to Play', canvas.width / 2, canvas.height - 100);
    ctx.fillText('Controls: Arrow Keys / WASD to Move, Space to Jump', canvas.width / 2, canvas.height - 60);
    ctx.fillText('M = Toggle Music | N = Toggle Sound', canvas.width / 2, canvas.height - 30);
    ctx.textAlign = 'left';
  }
}
