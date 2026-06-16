# Arrow Maze Backend

REST API for Arrow Maze, built with Node.js, Express, and TypeScript.

## Tech Stack

- Node.js
- Express
- TypeScript
- Swagger / OpenAPI
- Jest
- Supertest
- Docker
- ESLint
- Husky
- Commitlint

## Architecture Overview

The backend follows Clean Architecture.

```txt
framework -> infrastructure -> application -> domain
```

Business rules belong in `src/domain`. Use cases and ports belong in `src/application`. Database, JWT, hashing, and logging implementations belong in `src/infrastructure`. Express, routes, controllers, middleware, Swagger, and server bootstrap belong in `src/framework`.

## Folder Structure

```txt
src/domain/
src/application/
src/infrastructure/
src/framework/
src/shared/
tests/
docs/
ai-log/
```

## Getting Started

```bash
npm install
npm run dev
```

The API exposes:

```txt
GET /health
GET /docs
```

## Quality Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## CI/CD

Pull requests run lint, typecheck, tests, and build through GitHub Actions.

## Contributing

See `CONTRIBUTING.md`.

## AI Usage

Every significant AI-assisted task must create an entry in `ai-log/`. The final summary is maintained in `AI_USAGE.md`.

## License

Academic project. License decision pending team approval.
