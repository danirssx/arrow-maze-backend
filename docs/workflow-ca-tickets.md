# Workflow — CA Tickets (Clean Architecture)

Los tickets **CA-xxx** son refactors o correcciones de arquitectura limpia identificados por el
equipo durante el Milestone M8. Siguen el pipeline estándar definido en `docs/workflow.md` con
dos particularidades concretas:

1. El PR **debe** incluir la tabla `### Changed files` (ver formato en PR #52).
2. Los agentes de cierre (`judge` + `mutation`) se corren con confirmación humana explícita
   en cada paso.

---

## Tickets CA activos (Milestone M8)

| Ticket | CA-ID | Título | Estado |
|--------|-------|--------|--------|
| MAZ-154 | CA-001 | Separar errores de dominio puros del mapeo HTTP | PR #52 open |
| MAZ-155 | CA-002 | TBD | Backlog |
| MAZ-156 | CA-003 | TBD | Backlog |
| MAZ-158 | CA-005 | TBD | Backlog |

---

## Paso a paso completo

### 1. Spec Partner

Corre el agente `.agents/spec-partner.md`. Lee los archivos fuente involucrados, identifica las
causas raíz y propone el diseño. Escribe `specs/<ticket>-<ca-id>.spec.md` con la sección
`Clean Architecture contract` completa (obligatoria para que el judge no rechace).

### 2. Planner / Gherkin

Corre el agente `.agents/planner.md`. Destila los escenarios Gherkin en `specs/<ticket>-<ca-id>.feature`.
Cada escenario lleva tag `@s<n>`.

### 3. Aprobación humana del contrato Gherkin ⏸

**El humano revisa y aprueba** el `.feature` antes de continuar. Esta es la única puerta de
aprobación. Si el humano pide cambios, vuelve al paso 2.

### 4. TDD Implementer

Corre el agente `.agents/tdd-implementer.md`. Ciclos Rojo → Verde → Refactor, un escenario
`@s` a la vez. El agente:

- Escribe el test rojo
- Implementa lo mínimo para verde
- Refactoriza en verde
- Anota el mapa `@s → test` en el `ai-log/`

Al terminar todos los escenarios corre `npm run verify` y reporta verde.

### 5. Code Review

Corre `/code-review --effort high` sobre el diff del branch. Tres ángulos (line-by-line,
removed-behavior, cross-file) con verificación por agente independiente. Fixea todos los
hallazgos CONFIRMED / PLAUSIBLE antes de continuar.

### 6. Judge — pedir confirmación al humano

Presentar tabla de estado con lo pendiente y preguntar:

> "¿Corremos el judge ahora?"

Corre el agente `.agents/judge.md`. El judge lee el contrato CA, verifica cobertura de
escenarios, disciplina TDD, regla de dependencia y corre `npm run verify`.

- Si `APPROVED` → continuar al paso 7.
- Si `CHANGES_REQUESTED` → volver al paso 4 con el tdd-implementer para corregir.

El veredicto se escribe en `ai-log/<fecha>-<ticket>-judge.md`.

### 7. Mutation — pedir confirmación al humano

Después del `APPROVED` del judge, preguntar:

> "¿Corremos mutation?"

Corre el agente `.agents/mutation.md`. StrykerJS sobre los archivos `src/domain` y
`src/application` tocados por el ticket. Umbral: 80% (definido en `docs/mutation-testing.md`).

- Si `PASS` → continuar al paso 8.
- Si `FAIL` → **sub-ciclo automático** (sin preguntar):
  1. Corre tdd-implementer para escribir los tests que matan los mutantes sobrevivientes
  2. Corre judge nuevamente
  3. Corre mutation nuevamente
  4. Repetir hasta `PASS`

El veredicto se escribe en `ai-log/<fecha>-<ticket>-mutation.md`.

### 8. PR — tabla Changed files obligatoria

El PR de un ticket CA **debe** incluir la sección `### Changed files` en el Summary con esta
estructura (referencia: [PR #52](https://github.com/danirssx/arrow-maze-backend/pull/52)):

```markdown
### Changed files

| File | Change |
|------|--------|
| `src/domain/errors/DomainError.ts` | Descripción del cambio |
| `src/framework/errors/DomainErrorMapper.ts` | **New** — descripción |
| `tests/...` | Descripción |
```

Reglas de la tabla:
- Una fila por archivo modificado o creado.
- Marcar archivos nuevos con `**New** —` al inicio del campo `Change`.
- Archivos eliminados: indicar `**Deleted**`.
- El campo `Change` describe el *qué cambió*, no el *por qué* (el Summary ya lo explica).

### 9. Merge y Linear (tarea del humano)

El humano:
1. Revisa el PR y lo mergea a `develop`.
2. Mueve el ticket en Linear a **Done**.
3. Deja comentario en Linear con branch + PR URL + resultado de verify.

---

## Resumen del flujo de agentes

```
[spec-partner] → specs/<ticket>.spec.md
[planner]      → specs/<ticket>.feature
⏸ HUMANO APRUEBA el contrato Gherkin
[tdd-implementer] → src/, tests/, ai-log/
[/code-review]    → hallazgos → fixes
⏸ PREGUNTAR: "¿Corremos el judge?"
[judge]        → ai-log/<ticket>-judge.md
  ↳ CHANGES_REQUESTED → volver a tdd-implementer
  ↳ APPROVED →
⏸ PREGUNTAR: "¿Corremos mutation?"
[mutation]     → ai-log/<ticket>-mutation.md
  ↳ FAIL → sub-ciclo automático: tdd-implementer → judge → mutation
  ↳ PASS →
PR abierto con tabla Changed files
⏸ HUMANO MERGEA + actualiza Linear
```
