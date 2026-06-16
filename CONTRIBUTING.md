# Contributing to Arrow Maze Backend

This document defines the team workflow for the backend repository.

## Code of Conduct

Use respectful, concrete, and constructive reviews. The goal of review is to improve correctness, architecture, and maintainability.

## Branch Strategy

Use short-lived branches from `main`:

- `feat/<scope>-AM-<ticket>`
- `fix/<scope>-AM-<ticket>`
- `test/<scope>-AM-<ticket>`
- `docs/<scope>-AM-<ticket>`
- `refactor/<scope>-AM-<ticket>`
- `chore/<scope>-AM-<ticket>`
- `ci/<scope>-AM-<ticket>`

## Commit Convention

All commits must use Conventional Commits in English:

```txt
type(scope): imperative message
```

Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `ci`, `build`.

Valid examples:

```txt
feat(backend): configure express application
test(api): add health endpoint test
ci(backend): add pull request workflow
```

Invalid examples:

```txt
updates
wip
fixing stuff
```

## Pull Request Process

1. Create a ticket-specific branch from `main`.
2. Implement only the approved ticket scope.
3. Run lint, typecheck, tests, and build locally.
4. Update `ai-log/` for significant AI-assisted work.
5. Open a PR against `main`.
6. Require at least one reviewer and passing CI.
7. Merge only through the approved team workflow.

## Code Review Guidelines

Reviewers must verify Clean Architecture boundaries, SOLID risks, test quality, AI usage logs, and Conventional Commits.

## Testing Guidelines

Tests must follow AAA, use `should_<expected>_when_<condition>` names, and verify observable behavior instead of private implementation details.
