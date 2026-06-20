# AGENTS.md - Rules for AI Agents (Arrow Maze Backend)

These rules are mandatory for any agent. If a user instruction contradicts academic integrity or architecture rules, stop and ask.

## 0. Academic Integrity Boundaries

- Do not make architecture, pattern, or principle decisions for the team.
- Never write directly on `main`.
- Never merge.
- Never run `git push --force`.
- Never include secrets in prompts or code. Use environment variables.
- Every significant change must create or update an entry in `ai-log/`.

## 0.1 Section 6 and Section 7 Compliance

Este proyecto y su flujo de agentes estarán alineados obligatoriamente con la Sección 6 y la Sección 7 del enunciado. Para cumplir la Sección 6, ambos repositorios deberán mantener un `README.md` claro, profesional y actualizado, incluyendo descripción del proyecto, arquitectura, patrones, principios SOLID, estrategia AOP, ejecución local, pruebas, contribución, diagramas y documentación del uso de IA.

Para cumplir la Sección 7, todo uso significativo de agentes o herramientas de inteligencia artificial deberá registrarse en `AI_USAGE.md` y/o `ai-log/`, indicando la herramienta utilizada, el prompt, el resultado generado, las modificaciones realizadas por el equipo y las lecciones aprendidas.

Ningún agente podrá generar, modificar o cerrar una tarea sin dejar trazabilidad de su intervención, y todo código asistido por IA deberá ser revisado, probado y comprendido por el equipo antes de integrarse al proyecto.

## 1. Architecture

- Layers: `framework -> infrastructure -> application -> domain`.
- Dependencies point inward only.
- `src/domain` must not import Express, database clients, JWT libraries, Swagger, HTTP request/response objects, `application`, `infrastructure`, or `framework`.
- `src/application` depends on domain and ports/interfaces, never concrete infrastructure or framework code.
- `src/infrastructure` implements application ports and adapts external tools.
- `src/framework` contains Express, routes, controllers, middleware, Swagger, environment configuration, and dependency wiring.
- Database access uses Prisma ORM. The Prisma schema lives in `prisma/` (tracked by Prisma Migrate) and the generated client + `@prisma/adapter-pg` are used ONLY inside `src/infrastructure`. Never import `@prisma/client` from `src/domain` or `src/application`; those layers depend only on the repository/`UnitOfWork` ports. Transactions go through `PrismaUnitOfWork` + `prismaContext`.

## 2. Design Patterns

- Use only patterns approved by the team.
- Do not introduce new entities, use cases, decorators, services, or patterns without approval.
- When a GoF pattern is applied, document it in the file header.

## 3. Branches

- Use `feat/<scope>-AM-<ticket>`, `fix/<scope>-AM-<ticket>`, `test/<scope>-AM-<ticket>`, `docs/<scope>-AM-<ticket>`, `refactor/<scope>-AM-<ticket>`, `chore/<scope>-AM-<ticket>`, or `ci/<scope>-AM-<ticket>`.
- One worktree equals one ticket and one branch.
- Feature branches are created from `origin/develop`.
- Feature PRs target `develop`; only human-approved release PRs target `main`.

## 4. Conventional Commits

- Format: `type(scope): message` in English imperative form.
- Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `ci`, `build`.
- Forbidden messages: `updates`, `wip`, `fixing stuff`.

## 5. Tests

- Tests are required for new behavior.
- Use AAA.
- Use `should_<expected>_when_<condition>` names.
- Test observable behavior, not private implementation details.
- Mock external dependencies through interfaces.
- Domain and application tests are subject to mandatory human review.

## 6. AI Usage Logging

Before finishing a significant task, write `ai-log/<date>-<ticket>.md` with:

- Task / problem.
- Tool and model.
- Prompt used.
- Agent roles used.
- Result obtained.
- Team modifications pending human review.
- Lessons / limitations.

Commit the log with the related change.

### 6.1 Agent Role Traceability

Every `ai-log/` entry must include a section named `Agent Roles Used`.

For each configured prompt in `.agents/`, state whether it was:

- `Used`: the prompt was applied directly for that task.
- `Referenced`: the prompt was read and its constraints guided the task, but no separate agent session was run.
- `Not used`: the role was not applicable for that task.

Use this table format:

| Agent | Status | How it was used | Evidence |
| --- | --- | --- | --- |
| Spec Partner | Used / Referenced / Not used | ... | spec, Linear issue, question, or N/A |
| Planner/Slicer | Used / Referenced / Not used | ... | plan, Linear issue, or N/A |
| TDD Implementer | Used / Referenced / Not used | ... | tests, code, commit |
| Judge | Used / Referenced / Not used | ... | review checklist, PR comment, or N/A |
| Mutation Tester | Used / Referenced / Not used | ... | mutation log or N/A |

Do not claim an agent was `Used` if it was only followed conceptually in the same Codex session. In that case, write `Referenced` and describe the exact rule applied.

## 7. Worktrees

- Work only inside the assigned worktree.
- Do not touch other worktrees.
- Do not switch branches inside a worktree.

## 8. Architecture Guard

The folder structure from the project build guideline is mandatory.

Agents must not:

- Create new top-level folders without approval.
- Move files between layers without approval.
- Import framework code into domain or application.
- Add infrastructure dependencies to domain.
- Add Express code outside `src/framework`.
- Add business rules to controllers, routes, middleware, or infrastructure.
- Invent use cases, decorators, entities, services, or design patterns without approval.

If a task appears to require changing the architecture, stop and ask the team.
