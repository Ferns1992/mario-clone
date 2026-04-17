# Mario Clone

A classic 2D platformer game built with HTML5 Canvas, Node.js, Express, and SQLite. Features Mario-style music, sound effects, user authentication, persistent high scores, and Docker deployment support.

## Features

- Classic side-scrolling platformer gameplay
- Collect coins, stomp enemies, reach the flag
- Lives system (3 lives per game)
- Multiple levels with increasing difficulty
- Mario-style music and sound effects
- Power-ups: Mushrooms, Fire Flowers, Stars
- Enemies: Goombas and Koopas (with shell mechanics)
- Coyote time and jump buffering for smooth controls
- **User authentication system with login/registration**
- **Admin panel to manage users**
- Persistent high scores with SQLite database
- Player statistics tracking
- Docker support for easy deployment

## Quick Start

### Local Development

```bash
npm install
npm start
```

Open http://localhost:3030 in your browser.

### Docker Deployment

```bash
docker-compose up -d
```

## User Authentication

### Default Admin Login
- **Username:** `admin`
- **Password:** `admin`

### For Players
1. Click "Create Account" on login screen
2. Register with username and password
3. Wait for admin approval
4. Login with approved account

### Admin Features
After logging in as admin:
- Click the **ADMIN** button (yellow)
- **Pending Users tab** - Approve or reject new registrations
- **All Users tab** - Edit users:
  - Change password
  - Change role (admin/player)

## Controls

- **Move Left:** Arrow Left / A
- **Move Right:** Arrow Right / D
- **Jump:** Space / Arrow Up / W (hold for higher jump)
- **M:** Toggle music
- **N:** Toggle sound effects

## Tech Stack

- **Frontend:** HTML5 Canvas + Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** SQLite (via sql.js)
- **Authentication:** Session-based with JWT tokens
- **Container:** Docker
- **Audio:** Web Audio API (procedurally generated sounds)

## Game Elements

### Characters
- **Mario** - Playable character with walking, jumping, and running animations
- **Goomba** - Basic enemy, stompable
- **Koopa** - Enemy that becomes a shell when stomped, shell can be kicked

### Power-ups
- **Super Mushroom** - Makes Mario big
- **Fire Flower** - Gives Mario fire powers (visual)
- **Star** - Temporary invincibility

### Blocks
- **Question Block** - Contains coins or power-ups
- **Brick** - Breakable when big and running

## Audio

The game features procedurally generated Mario-style music and sound effects:
- Main theme music during gameplay
- Jump sounds (small and big)
- Coin collection chime
- Enemy stomp sound
- Power-up collection fanfare
- Death melody
- Level complete fanfare
- Game over music

Click the MUSIC/SOUND buttons on the menu to toggle audio.

## API Endpoints

### Public Endpoints (No Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/login` | User login |
| POST | `/api/register` | Register new user |

### Protected Endpoints (Auth Required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scores` | Get top 10 high scores |
| POST | `/api/scores` | Submit new score |
| GET | `/api/players/:name` | Get player stats |
| GET | `/api/me` | Get current user info |

### Admin Endpoints (Admin Only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/pending` | List pending users |
| POST | `/api/users/:id/approve` | Approve user |
| POST | `/api/users/:id/reject` | Reject user |
| PUT | `/api/users/:id/password` | Change user password |
| PUT | `/api/users/:id/role` | Change user role |
| PUT | `/api/settings/:key` | Update game settings |

### API Examples

**Login:**
```bash
curl -X POST http://localhost:3030/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**Register:**
```bash
curl -X POST http://localhost:3030/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"password123"}'
```

**Submit Score (with auth):**
```bash
curl -X POST http://localhost:3030/api/scores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"playerName":"MarioFan","score":5000,"level":3,"coinsCollected":25,"enemiesStomped":12}'
```

## Deployment

### Portainer

1. Log into Portainer
2. Create a new Stack
3. Copy contents of `portainer-compose.yml`
4. Deploy the stack

### Dockge

1. Log into Dockge
2. Create a new stack
3. Copy contents of `dockge-compose.yml`
4. Deploy the stack

### Manual Docker

```bash
docker build -t mario-clone .
docker run -d -p 3030:3000 \
  -v mario-data:/app/data \
  --name mario-clone \
  mario-clone
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3030 | Server port |
| DB_PATH | ./data/mario.db | Database file path |
| ADMIN_USER | admin | Default admin username |
| ADMIN_PASS | admin | Default admin password |

## Data Persistence

Game data is stored in a SQLite database located at:
- Local: `./data/mario.db`
- Docker: `/app/data/mario.db` (persisted via volume)

Database contains:
- Users table (username, password hash, role, status)
- Players table (game player names linked to users)
- Scores table (game scores and statistics)
- Game settings table

## Project Structure

```
mario-clone/
├── public/
│   ├── index.html     # Main game page with login/register/admin
│   ├── game.js       # Game logic with audio
│   └── style.css     # Styling
├── server.js         # Express server with auth
├── database.js       # SQLite database module
├── package.json      # Dependencies
├── Dockerfile        # Docker image
├── docker-compose.yml    # Docker Compose (standard)
├── portainer-compose.yml  # Portainer deployment
├── dockge-compose.yml    # Dockge deployment
├── README.md         # Documentation
└── SPEC.md           # Project specification
```

## Browser Compatibility

Works best in modern browsers:
- Chrome 60+
- Firefox 55+
- Edge 79+
- Safari 11+

Note: Audio requires user interaction (click) to start due to browser autoplay policies.

## Security

- Passwords are hashed using SHA-256
- Session tokens expire after 24 hours
- New users require admin approval
- Role-based access control for admin features

## License

MIT
