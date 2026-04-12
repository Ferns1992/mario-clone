# Mario Clone - Game Specification

## 1. Project Overview

**Project Name:** Mario Clone
**Type:** 2D Platformer Game with Backend API
**Core Functionality:** Classic side-scrolling platformer with persistent high scores and player stats stored in SQLite database
**Target Users:** Casual gamers, retro game enthusiasts

## 2. Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** SQLite (file-based, perfect for Docker)
- **Frontend:** HTML5 Canvas + Vanilla JavaScript
- **Container:** Docker + Docker Compose
- **Deployment:** Portainer / Dockge compatible

## 3. Game Features

### Core Mechanics
- Side-scrolling platformer gameplay
- Player character (Mario-style plumber) with:
  - Walking left/right (Arrow keys or A/D)
  - Jumping (Space or W or Up Arrow)
  - Collision detection with platforms and enemies
- Platforms (static and moving)
- Collectible coins
- Enemies (Goomba-style) that can be stomped
- Goal flag at end of level
- Lives system (3 lives)
- Score tracking

### Game States
- Start Screen (Press Start)
- Playing
- Game Over
- Level Complete
- High Score display

## 4. Database Schema

### Tables

**players**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| name | TEXT | Player name |
| created_at | DATETIME | Creation timestamp |

**scores**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| player_id | INTEGER | FK to players |
| score | INTEGER | Final score |
| level | INTEGER | Level reached |
| coins_collected | INTEGER | Total coins |
| enemies_stomped | INTEGER | Enemies defeated |
| played_at | DATETIME | Game timestamp |

**game_settings**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-increment ID |
| setting_key | TEXT UNIQUE | Setting name |
| setting_value | TEXT | Setting value |

## 5. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/scores | Get top 10 high scores |
| POST | /api/scores | Submit new score |
| GET | /api/players/:name | Get player stats |
| POST | /api/players | Create/get player |
| GET | /api/settings | Get game settings |
| PUT | /api/settings/:key | Update setting |

## 6. Docker Configuration

- **Dockerfile:** Multi-stage build (Node.js production)
- **docker-compose.yml:** Full stack with:
  - app service (Node.js)
  - Volume for SQLite persistence
- **portainer-compose.yml:** For Portainer deployment
- **dockge-compose.yml:** For Dockge deployment

## 7. Visual Design

### Color Palette
- Sky Blue: #5C94FC (background)
- Brick Brown: #C84C0C (platforms)
- Coin Gold: #FFD700
- Mario Red: #E52521
- Goomba Brown: #A0522D
- Grass Green: #00A800

### Game Dimensions
- Canvas: 800x480 pixels
- Tile size: 32x32 pixels

## 8. Acceptance Criteria

1. Game loads and displays start screen
2. Player can move left/right and jump
3. Collision with platforms works correctly
4. Coins can be collected and add to score
5. Enemies can be stomped or cause death
6. Score is saved to database via API
7. High scores are displayed
8. Docker container builds successfully
9. Application runs in Docker with data persistence
10. Portainer/Dockge deployment works
