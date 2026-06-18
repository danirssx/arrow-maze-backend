# Local Docker Setup

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running (Engine status: green)

## First-time setup

1. Copy the environment file:

```bash
cp .env.example .env
```

2. Build and start the stack:

```bash
docker compose up --build
```

That's it. Docker will pull the images, build the backend, and start both services.

## Services

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

Database credentials (for a local client like DBeaver or TablePlus):

| Field | Value |
|-------|-------|
| Host | localhost |
| Port | 5432 |
| Database | arrow_maze |
| User | arrow_maze |
| Password | arrow_maze |

## Common commands

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after code changes
docker compose up --build

# Remove containers and volumes (clean slate)
docker compose down -v
```

## Troubleshooting

**`sh: husky: not found` during build**

Fixed in the current Dockerfile with `--ignore-scripts`. If you see this on an older branch, pull latest `main`.

**Port 3000 or 5432 already in use**

Stop the conflicting process or change the port in `docker-compose.yml` and `.env`.
