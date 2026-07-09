# Workflow — Uncle Bob Craftsmanship Pipeline (Backend)

This repository follows a Robert C. Martin–style craftsmanship pipeline.
Robert C. Martin no teclea la solución: la conversa, la divide en escenarios
ejecutables y deja que la disciplina (TDD + juicio + mutación) la talle.

> "Agents draft, judgment prunes." El borrador es barato; el juicio es el
> juego entero.

## Las cinco fases

Toda feature significativa recorre cinco fases. Hay **una sola puerta de
aprobación humana**, justo después del contrato Gherkin: el humano firma el
*contrato ejecutable* antes de que se escriba una línea de producción.

```
idea
  → [spec-partner]   conversación / debate  → specs/<feature>.spec.md
  → [planner]        spec → contrato Gherkin (.feature) + tickets Linear
  → ⏸ HUMANO APRUEBA el contrato ejecutable (@s1..@sn)
  → in_progress
  → [tdd-implementer] ciclo Rojo → Verde → Refactor (un test a la vez)
  → [judge]           el review es el juego entero (APPROVED / CHANGES)
  → [mutation]        mata mutantes; valida que los tests muerden
  → done
```

NUNCA se salta a TDD si el contrato `.feature` no está aprobado por el humano.
NUNCA se declara `done` sin que el `judge` apruebe **y** la mutación supere el
umbral de [`mutation-testing.md`](./mutation-testing.md).

## Agentes (`.agents/`)

| Fase | Agente | Escribe | Salida de una línea |
| --- | --- | --- | --- |
| 1 | `spec-partner` | `specs/<feature>.spec.md` | `spec_updated -> ...` |
| 2 | `planner` (Gherkin Author) | `specs/<feature>.feature`, `plan/<milestone>.md`, tickets | `plan_ready -> ...` |
| 3 | `tdd-implementer` | `src/`, `tests/`, `ai-log/` | `green -> ...` |
| 4 | `judge` | `ai-log/<...>-judge.md`, comentario PR | `APPROVED -> ...` |
| 5 | `mutation` | `ai-log/<...>-mutation.md` | `PASS -> ...` |

Detalle de cada rol en su archivo `.agents/<rol>.md`.

## Regla anti-teléfono-descompuesto

Cada agente **escribe sus resultados en archivos** (`specs/`, `.feature`,
`plan/`, `ai-log/`) y devuelve **una sola línea** de referencia. El contenido
vive en disco y queda versionado; nunca se pasa el trabajo por chat.

## Escalado de esfuerzo

| Complejidad | Agentes |
| --- | --- |
| Trivial (1 endpoint/cambio) | spec-partner → planner → ⏸ → tdd-implementer → judge → mutation |
| Media (2-3 archivos) | + explorar el código antes del TDD |
| Refactor grande | dividir por escenario Gherkin; un ciclo TDD por `@s` |

## Worktrees y ramas

Una feature = un worktree = un ticket = una rama, creada desde
`origin/develop`. Los PRs de feature apuntan a `develop`; solo los releases
aprobados por humano apuntan a `main`. Ver
[`zed-worktree-agents.md`](./zed-worktree-agents.md).

## Puerta verde

El equivalente al `./init.sh` de la narrativa Uncle Bob es:

```bash
npm run verify   # lint + typecheck + test:coverage + build
```

Ningún agente aprueba ni cierra con esta puerta en rojo.
