# Release Guide

## Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 16 (local Docker or cloud provider)
- GitHub repository with Actions enabled

## Environment variables

Copy `.env.example` to `.env` and fill in your values (never commit `.env`):

```
NODE_ENV=production
DATABASE_URL=<your-cloud-database-url>
DATABASE_SSL=true
JWT_SECRET=<strong-random-secret>
PORT=3000
CORS_ORIGIN=<your-frontend-origin>
```

## Cloud database setup (Neon / Supabase / Railway / Render)

1. Create a PostgreSQL instance on your chosen provider.
2. Copy the connection string into `DATABASE_URL`.
3. Set `DATABASE_SSL=true` (all cloud providers require SSL).
4. Run migrations once against the cloud database:

```bash
psql $DATABASE_URL -f src/infrastructure/database/migrations/001_create_users.sql
psql $DATABASE_URL -f src/infrastructure/database/migrations/002_create_leaderboards.sql
psql $DATABASE_URL -f src/infrastructure/database/migrations/003_create_player_progress.sql
```

**Connection string formats by provider:**

| Provider | Format |
| --- | --- |
| Neon | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require` |
| Supabase | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| Railway | `postgresql://postgres:pass@host.railway.app:5432/railway` |
| Render | `postgresql://user:pass@host.render.com/dbname` |

## Local Docker setup

```bash
cp .env.example .env
# Set DATABASE_SSL=false in .env for local Docker
docker compose up --build
```

## Verify before release

```bash
npm run verify   # lint + typecheck + test:coverage + build
```

All checks must pass before opening a release PR.

## Deployment (GitHub Actions)

The deploy workflow (`.github/workflows/deploy.yml`) triggers on every push to `main`. Configure it with your platform credentials as GitHub repository secrets:

- `RAILWAY_TOKEN` — if using Railway
- `RENDER_DEPLOY_HOOK` — if using Render

See the workflow file comments for platform-specific steps.

## Versioning

Follows semver. Tag releases as `v<major>.<minor>.<patch>` on `main`:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## CI/CD

Every PR runs: install → lint → typecheck → test:coverage → build via GitHub Actions (`pull-request.yml`).
Production deploys run after `verify` passes on `main` (`deploy.yml`).
