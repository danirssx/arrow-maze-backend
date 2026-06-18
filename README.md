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

## Academic Compliance

This repository must stay aligned with Section 6 and Section 7 of the project statement.

Section 6 requires a clear, professional, and updated `README.md` covering project description, architecture, design patterns, SOLID principles, AOP strategy, local execution, tests, contribution workflow, diagrams, and AI usage documentation.

Section 7 requires every significant AI-assisted intervention to be documented in `AI_USAGE.md` and/or `ai-log/`, including the tool, prompt, generated result, team modifications, and lessons learned. AI-assisted code must be reviewed, tested, and understood by the team before integration.

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
npm run test:coverage
npm run build
npm run verify
```

## Architecture Guardrails

Clean Architecture boundaries are enforced by ESLint through `import/no-restricted-paths`.

Current guarded rules:

- `src/domain` must not import `src/application`, `src/infrastructure`, or `src/framework`.
- `src/application` must not import `src/infrastructure` or `src/framework`.
- `src/infrastructure` must not import `src/framework`.

If a ticket requires changing these boundaries, stop and ask the team before editing code.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## CI/CD

Pull requests run install, lint, typecheck, tests with coverage, and build through GitHub Actions.

## Contributing

See `CONTRIBUTING.md`.

## AI Usage

Every significant AI-assisted task must create an entry in `ai-log/`. The final summary is maintained in `AI_USAGE.md`.

## License

Academic project. License decision pending team approval.
