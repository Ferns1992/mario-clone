# Mario Clone

A classic 2D platformer game built with HTML5 Canvas, Node.js, Express, and SQLite. Features persistent high scores and Docker deployment support.

## Features

- Classic side-scrolling platformer gameplay
- Collect coins, stomp enemies, reach the flag
- Lives system (3 lives per game)
- Multiple levels with increasing difficulty
- Persistent high scores with SQLite database
- Player statistics tracking
- Docker support for easy deployment

## Controls

- **Move Left:** Arrow Left / A
- **Move Right:** Arrow Right / D
- **Jump:** Space / Arrow Up / W

## Tech Stack

- **Frontend:** HTML5 Canvas + Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** SQLite (via sql.js)
- **Container:** Docker

## Quick Start

### Local Development

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

### Docker Deployment

```bash
docker-compose up -d
```

The game will be available at http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/scores` | Get top 10 high scores |
| POST | `/api/scores` | Submit new score |
| GET | `/api/players/:name` | Get player stats |
| POST | `/api/players` | Create/get player |
| GET | `/api/settings` | Get game settings |

### Submit Score Example

```bash
curl -X POST http://localhost:3000/api/scores \
  -H "Content-Type: application/json" \
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
docker run -d -p 3000:3000 \
  -v mario-data:/app/data \
  --name mario-clone \
  mario-clone
```

## Data Persistence

Game data is stored in a SQLite database located at:
- Local: `./data/mario.db`
- Docker: `/app/data/mario.db` (persisted via volume)

## Project Structure

```
mario-clone/
├── public/
│   ├── index.html     # Main game page
│   ├── game.js       # Game logic
│   └── style.css     # Styling
├── server.js         # Express server
├── database.js       # SQLite database module
├── package.json      # Dependencies
├── Dockerfile        # Docker image
├── docker-compose.yml    # Docker Compose (standard)
├── portainer-compose.yml  # Portainer deployment
├── dockge-compose.yml    # Dockge deployment
└── SPEC.md           # Project specification
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| DB_PATH | ./data/mario.db | Database file path |

## License

MIT
