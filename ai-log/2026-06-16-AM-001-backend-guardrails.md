# AI Usage Log: AM-001 Backend Guardrails

## Task / Problem

Resolve AM-001 by hardening backend guardrails for scripts, CI, architecture-boundary checks, and contributor documentation. Also review whether Linear MCP is configured for project-wide use and document safe setup guidance.

## Tool and Model

Codex / GPT-5.

## Prompt Used

The user asked Codex to check whether MCP was configured so anyone in the project could use it, provide a guideline for installing/using it, and resolve AM-001.

## Result Obtained

- Confirmed no shared MCP config is versioned in the project.
- Added a root Linear MCP guideline that documents safe user-local setup and usage.
- Added root `.gitignore` and `.env.example` to prevent committing local secrets.
- Updated backend test scripts so tests no longer pass when no tests exist.
- Added `test:coverage` and `verify` scripts.
- Updated backend PR CI to run tests with coverage.
- Documented backend architecture guardrails in `README.md` and `CONTRIBUTING.md`.
- Updated the PR template to require `npm run verify`.

## Team Modifications Pending Human Review

- Confirm the team-approved Linear MCP server or connector choice for each developer environment.
- Rotate any Linear API key that was pasted into chat or visible context.
- Confirm whether `npm run verify` should become a required local command before every PR.

## Lessons / Limitations

MCP secrets should not be committed or pasted into prompts. The repository can safely document the environment contract, but actual MCP authentication must remain user-local or connector-managed.

