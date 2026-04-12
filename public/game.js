const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const API_URL = window.location.origin;

const TILE_SIZE = 32;
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;

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

const keys = {
  left: false,
  right: false,
  up: false,
  space: false
};

const player = {
  x: 50,
  y: 300,
  width: 28,
  height: 32,
  vx: 0,
  vy: 0,
  onGround: false,
  facingRight: true,
  isBig: false
};

let platforms = [];
let coinsArray = [];
let enemies = [];
let powerups = [];
let flag = null;

const menuOverlay = document.getElementById('menu-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const scoresOverlay = document.getElementById('scores-overlay');
const levelCompleteOverlay = document.getElementById('level-complete-overlay');

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('scores-btn').addEventListener('click', showHighScores);
document.getElementById('restart-btn').addEventListener('click', restartGame);
document.getElementById('menu-btn').addEventListener('click', showMenu);
document.getElementById('back-btn').addEventListener('click', showMenu);
document.getElementById('next-level-btn').addEventListener('click', nextLevel);

document.getElementById('playerName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') startGame();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = true;
  if (e.key === ' ') {
    keys.space = true;
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
  if (e.key === ' ') keys.space = false;
});

function startGame() {
  playerName = document.getElementById('playerName').value.trim() || 'Player';
  if (playerName.length === 0) playerName = 'Player';
  
  score = 0;
  coins = 0;
  lives = 3;
  level = 1;
  enemiesStomped = 0;
  scrollOffset = 0;
  
  initLevel();
  gameState = 'playing';
  menuOverlay.classList.add('hidden');
  gameoverOverlay.classList.add('hidden');
  levelCompleteOverlay.classList.add('hidden');
  scoresOverlay.classList.add('hidden');
  
  updateUI();
  gameLoop();
}

function initLevel() {
  player.x = 50;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  
  platforms = [];
  coinsArray = [];
  enemies = [];
  powerups = [];
  
  for (let i = 0; i < 20; i++) {
    platforms.push({
      x: i * TILE_SIZE * 2,
      y: 416,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 2,
      type: 'ground'
    });
  }
  
  platforms.push({ x: 300, y: 320, width: 96, height: 32, type: 'brick' });
  platforms.push({ x: 500, y: 256, width: 96, height: 32, type: 'brick' });
  platforms.push({ x: 700, y: 320, width: 64, height: 32, type: 'brick' });
  platforms.push({ x: 850, y: 256, width: 128, height: 32, type: 'brick' });
  platforms.push({ x: 1000, y: 192, width: 96, height: 32, type: 'brick' });
  platforms.push({ x: 1200, y: 320, width: 96, height: 32, type: 'brick' });
  platforms.push({ x: 1400, y: 256, width: 64, height: 32, type: 'brick' });
  platforms.push({ x: 1600, y: 192, width: 128, height: 32, type: 'brick' });
  platforms.push({ x: 1800, y: 320, width: 96, height: 32, type: 'brick' });
  platforms.push({ x: 2000, y: 256, width: 96, height: 32, type: 'brick' });
  
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
    { x: 2020, y: 216 }, { x: 2060, y: 216 }
  ];
  
  coinPositions.forEach(pos => {
    coinsArray.push({ x: pos.x, y: pos.y, width: 24, height: 24, collected: false });
  });
  
  const enemyPositions = [
    { x: 400, y: 384 }, { x: 600, y: 384 },
    { x: 900, y: 384 }, { x: 1100, y: 384 },
    { x: 1300, y: 384 }, { x: 1500, y: 384 },
    { x: 1700, y: 384 }, { x: 1900, y: 384 },
    { x: 2100, y: 384 }
  ];
  
  enemyPositions.forEach(pos => {
    enemies.push({
      x: pos.x,
      y: pos.y,
      width: 28,
      height: 28,
      vx: -1,
      alive: true,
      squashTimer: 0
    });
  });
  
  flag = { x: levelWidth - 100, y: 256, width: 32, height: 160 };
  
  levelWidth = 2400 + (level - 1) * 400;
}

function gameLoop() {
  if (gameState !== 'playing') return;
  
  update();
  render();
  animationFrame++;
  
  requestAnimationFrame(gameLoop);
}

function update() {
  if (keys.left) {
    player.vx = -MOVE_SPEED;
    player.facingRight = false;
  } else if (keys.right) {
    player.vx = MOVE_SPEED;
    player.facingRight = true;
  } else {
    player.vx = 0;
  }
  
  if ((keys.up || keys.space) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
  }
  
  player.vy += GRAVITY;
  
  player.x += player.vx;
  player.y += player.vy;
  
  player.onGround = false;
  
  platforms.forEach(platform => {
    if (checkCollision(player, platform)) {
      if (player.vy > 0 && player.y + player.height - player.vy <= platform.y) {
        player.y = platform.y - player.height;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0 && player.y - player.vy >= platform.y + platform.height) {
        player.y = platform.y + platform.height;
        player.vy = 0;
      } else if (player.vx > 0) {
        player.x = platform.x - player.width;
      } else if (player.vx < 0) {
        player.x = platform.x + platform.width;
      }
    }
  });
  
  if (player.x < 0) player.x = 0;
  if (player.x > levelWidth - player.width) player.x = levelWidth - player.width;
  
  if (player.y > canvas.height + 50) {
    playerDie();
  }
  
  scrollOffset = Math.max(0, player.x - 200);
  
  coinsArray.forEach(coin => {
    if (!coin.collected && checkCollision(player, coin)) {
      coin.collected = true;
      score += 200;
      coins++;
      updateUI();
    }
  });
  
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    
    if (enemy.squashTimer > 0) {
      enemy.squashTimer--;
      return;
    }
    
    enemy.x += enemy.vx;
    
    platforms.forEach(platform => {
      if (enemy.x < platform.x + platform.width &&
          enemy.x + enemy.width > platform.x &&
          enemy.y + enemy.height >= platform.y &&
          enemy.y + enemy.height <= platform.y + 10) {
        enemy.y = platform.y - enemy.height;
      }
    });
    
    if (enemy.x <= 0 || enemy.x >= levelWidth - enemy.width) {
      enemy.vx *= -1;
    }
    
    if (checkCollision(player, enemy)) {
      if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2 + 10) {
        enemy.alive = false;
        enemy.squashTimer = 30;
        player.vy = JUMP_FORCE / 2;
        score += 100;
        enemiesStomped++;
        updateUI();
      } else {
        playerDie();
      }
    }
  });
  
  powerups.forEach((powerup, index) => {
    powerup.x += powerup.vx;
    powerup.y += powerup.vy;
    powerup.vy += GRAVITY * 0.5;
    
    platforms.forEach(platform => {
      if (checkCollision(powerup, platform)) {
        if (powerup.vy > 0) {
          powerup.y = platform.y - powerup.height;
          powerup.vy = 0;
        }
      }
    });
    
    if (checkCollision(player, powerup)) {
      player.isBig = true;
      player.height = 48;
      powerups.splice(index, 1);
      score += 1000;
      updateUI();
    }
  });
  
  if (flag && checkCollision(player, flag)) {
    levelComplete();
  }
}

function checkCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function playerDie() {
  lives--;
  updateUI();
  
  if (lives <= 0) {
    gameOver();
  } else {
    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    scrollOffset = 0;
  }
}

async function gameOver() {
  gameState = 'gameover';
  document.getElementById('final-score').textContent = score;
  gameoverOverlay.classList.remove('hidden');
  
  try {
    await fetch(`${API_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  score += 1000 * level;
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
  gameLoop();
}

function restartGame() {
  score = 0;
  coins = 0;
  lives = 3;
  level = 1;
  enemiesStomped = 0;
  scrollOffset = 0;
  playerName = document.getElementById('playerName').value.trim() || 'Player';
  
  initLevel();
  gameState = 'playing';
  gameoverOverlay.classList.add('hidden');
  updateUI();
  gameLoop();
}

function showMenu() {
  gameState = 'menu';
  menuOverlay.classList.remove('hidden');
  gameoverOverlay.classList.add('hidden');
  scoresOverlay.classList.add('hidden');
  levelCompleteOverlay.classList.add('hidden');
}

async function showHighScores() {
  scoresOverlay.classList.remove('hidden');
  menuOverlay.classList.add('hidden');
  
  try {
    const response = await fetch(`${API_URL}/api/scores`);
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

function render() {
  ctx.fillStyle = '#5C94FC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.translate(-scrollOffset, 0);
  
  platforms.forEach(platform => {
    if (platform.type === 'ground') {
      ctx.fillStyle = '#00A800';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(platform.x, platform.y, platform.width, 8);
    } else {
      ctx.fillStyle = '#C84C0C';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = '#8B4513';
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
      
      ctx.fillStyle = '#8B4513';
      for (let i = 0; i < platform.width; i += TILE_SIZE) {
        for (let j = 0; j < platform.height; j += TILE_SIZE) {
          ctx.fillRect(platform.x + i + 1, platform.y + j + 1, 1, platform.height - 2);
          ctx.fillRect(platform.x + i + 1, platform.y + j + 1, platform.width - 2, 1);
        }
      }
    }
  });
  
  coinsArray.forEach(coin => {
    if (!coin.collected) {
      const coinAnim = Math.sin(animationFrame * 0.1 + coin.x) * 2;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.ellipse(coin.x + coin.width / 2, coin.y + coin.height / 2 + coinAnim, 10, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.ellipse(coin.x + coin.width / 2, coin.y + coin.height / 2 + coinAnim, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  enemies.forEach(enemy => {
    if (enemy.squashTimer > 0) {
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(enemy.x, enemy.y + 20, enemy.width, 8);
      return;
    }
    
    if (enemy.alive) {
      ctx.fillStyle = '#A0522D';
      ctx.beginPath();
      ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.fillRect(enemy.x + 6, enemy.y + 8, 4, 4);
      ctx.fillRect(enemy.x + 18, enemy.y + 8, 4, 4);
      
      ctx.fillStyle = '#F4A460';
      ctx.fillRect(enemy.x + 2, enemy.y + enemy.height - 6, 8, 6);
      ctx.fillRect(enemy.x + 18, enemy.y + enemy.height - 6, 8, 6);
    }
  });
  
  if (flag) {
    ctx.fillStyle = '#00A800';
    ctx.fillRect(flag.x + 12, flag.y, 8, flag.height);
    
    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(flag.x + 20, flag.y);
    ctx.lineTo(flag.x + 60, flag.y + 20);
    ctx.lineTo(flag.x + 20, flag.y + 40);
    ctx.fill();
  }
  
  const marioX = player.facingRight ? player.x : player.x + player.width - 28;
  
  ctx.fillStyle = '#E52521';
  ctx.fillRect(player.x + 4, player.y + 12, 20, 12);
  
  ctx.fillStyle = '#F4A460';
  ctx.fillRect(player.x + 6, player.y + 2, 16, 12);
  
  ctx.fillStyle = '#E52521';
  const hatOffset = player.facingRight ? 0 : 8;
  ctx.fillRect(player.x + hatOffset, player.y, 16, 6);
  ctx.fillRect(player.x + hatOffset + 12, player.y + 2, 8, 4);
  
  ctx.fillStyle = '#000';
  ctx.fillRect(player.x + (player.facingRight ? 18 : 4), player.y + 6, 4, 4);
  
  if (player.vx !== 0 && player.onGround) {
    const legOffset = Math.sin(animationFrame * 0.3) * 4;
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 6, player.y + player.height - 2, 6, 2 + legOffset);
    ctx.fillRect(player.x + 16, player.y + player.height - 2, 6, 2 - legOffset);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 6, player.y + player.height - 2, 16, 2);
  }
  
  ctx.restore();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
  
  ctx.fillStyle = '#FFF';
  ctx.font = '14px monospace';
  ctx.fillText(`Player: ${playerName}`, 10, canvas.height - 6);
  ctx.fillText(`x: ${Math.floor(player.x)} y: ${Math.floor(player.y)}`, canvas.width - 120, canvas.height - 6);
}
