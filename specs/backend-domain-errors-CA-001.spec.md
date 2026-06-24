# Spec — Backend: separar errores de dominio puros del mapeo HTTP (CA-001)

Date: 2026-06-24
Ticket: `MAZ-154` (temporary id `CA-001`)
Source: `Clean_Architecture_Fix_Tickets_Proposal.md` — B-R1, B-R3, B-Y3
Status: approved

## Purpose

Eliminar el conocimiento HTTP del dominio desacoplando `DomainError` de `AppError`,
reemplazando `throw new Error()` en los VOs de leaderboard y progress por errores de
dominio controlados, creando un mapper en framework que traduzca dominio → HTTP, y
eliminando las validaciones duplicadas en `SubmitScoreService`.

## In scope / Out of scope

- In scope:
  - Desacoplar `DomainError` de `AppError` (quitar `httpStatus` del dominio).
  - Reemplazar `throw new Error()` en los 9 VOs afectados (`Score`, `MoveCount`,
    `TimeSeconds`, `Rank`, `UsernameSnapshot`, `MaxLeaderboardEntries`, `LevelScore`,
    `ProgressVersion`) por `InvalidArgumentError`.
  - Crear `DomainErrorMapper` en `src/framework/errors/` que traduzca código de error
    de dominio a HTTP status.
  - Actualizar `errorMiddleware` para manejar `DomainError` via el mapper.
  - Eliminar las pre-validaciones duplicadas en `SubmitScoreService` (líneas 38-46 actuales)
    que replican invariantes que ya viven en los VOs.
  - Tests de dominio para cada VO corregido y tests de middleware para el mapping.
- Out of scope:
  - Cambiar reglas de negocio de scoring/ranking.
  - Rediseñar el envelope HTTP de la API.
  - Modificar `ApplicationError`, `InfrastructureError` ni su jerarquía.

## Behavior

`DomainError` pasa a extender `Error` directamente, sin `httpStatus` ni referencia a
`AppError`. Sus subclases (`InvalidArgumentError`, `BusinessRuleViolationError`) exponen
solo `code` y `message`, ambos sin semántica HTTP.

Los 9 VOs que antes lanzaban `throw new Error(msg)` ahora lanzan
`throw new InvalidArgumentError(msg)`, que es un `DomainError` controlado.

`SubmitScoreService` elimina las pre-validaciones de `score`, `timeSeconds` y
`movesCount` (líneas 38-46). Ahora confía en que si los VOs reciben un valor inválido,
el `InvalidArgumentError` resultante será correctamente mapeado a 422 por el middleware.

`DomainErrorMapper` en `src/framework/errors/` es el único lugar del sistema que conoce
la traducción de un código de error de dominio a un HTTP status code. Por ahora todos los
`DomainError` mapean a 422 Unprocessable Entity.

`createErrorMiddleware` añade un branch `instanceof DomainError` antes del catch-all de
`AppError`, delega el status al mapper y responde con el envelope estándar.

## Clean Architecture contract

Applicable rules from `docs/reglas_clean_arch.md`:

- [x] Regla de dependencia (dependencies point inward only)
- [x] Independencia del dominio (no framework/ORM/HTTP/I/O in `src/domain`)
- [x] Application solo orquesta (no business rules, no infra/framework imports)
- [x] Repositorios: interfaz adentro (port), implementación afuera (infrastructure)
- [x] DTOs simples en fronteras (primitives/records, no `Date`, no domain entities)
- [x] Invariantes en VO/agregados (no en controllers/services de aplicación)
- [x] Errores de dominio sin semántica HTTP (mapping HTTP solo en `framework`)

Layer impact:

- Domain: `src/domain/errors/DomainError.ts` — rompe la herencia de `AppError`,
  queda como jerarquía pura. 9 VOs (leaderboard + progress) cambian `throw new Error()`
  por `throw new InvalidArgumentError()`.
- Application: `src/application/leaderboard/use-cases/SubmitScoreService.ts` — elimina
  pre-validaciones duplicadas de score, timeSeconds y movesCount.
- Infrastructure: no previsto.
- Framework: nuevo `src/framework/errors/DomainErrorMapper.ts`; actualización de
  `src/framework/errors/errorMiddleware.ts`.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: un test por VO corregido que verifica que el error es `instanceof DomainError`
  y que `httpStatus` no existe en el objeto.
- Application: tests de `SubmitScoreService` verificando que la validación sigue
  rechazando inputs inválidos (comportamiento conservado, implementación delegada).
- Adapter/API: tests del `errorMiddleware` verificando que un `DomainError` produce
  la respuesta HTTP correcta (status 422, body estándar con `code` y `message`).

Architecture acceptance criteria:

- Given the touched layers in this ticket, When imports are inspected, Then dependencies point inward only.
- Given boundaries are crossed, When DTOs are inspected, Then they are simple records/primitives.
- Given business invariants are involved, When implementation is inspected, Then they live in VO/agregados/domain services, not controllers/middleware.

## HTTP contract

No se crean endpoints nuevos. El cambio afecta las respuestas de error:

- Antes: un error de VO lanzado sin `AppError` retornaba 500 (caía al catch-all de unknown errors).
- Después: un `DomainError` (p.ej. `InvalidArgumentError`) retorna 422 con body:
  ```json
  { "success": false, "error": { "code": "INVALID_ARGUMENT", "message": "<detalle>" } }
  ```

## Edge cases

- `DomainError` sin subclase conocida por el mapper → fallback a 422.
- VO con `value = 0` en casos válidos vs inválidos (p.ej. `Score(0)` es válido; `MoveCount(0)` no).
- `SubmitScoreService` con score=0 sigue siendo válido (Score acepta 0).

## Acceptance criteria (Given/When/Then)

- S1: Given `Score` recibe un valor negativo, When se construye, Then lanza `InvalidArgumentError` con code `INVALID_ARGUMENT`.
- S2: Given `Score` recibe un valor decimal, When se construye, Then lanza `InvalidArgumentError`.
- S3: Given `MoveCount` recibe 0, When se construye, Then lanza `InvalidArgumentError`.
- S4: Given `TimeSeconds` recibe un valor menor o igual a cero, When se construye, Then lanza `InvalidArgumentError`.
- S5: Given `Rank` recibe 0, When se construye, Then lanza `InvalidArgumentError`.
- S6: Given `UsernameSnapshot` recibe string vacío, When se construye, Then lanza `InvalidArgumentError`.
- S7: Given `MaxLeaderboardEntries` recibe 0, When se construye, Then lanza `InvalidArgumentError`.
- S8: Given `LevelScore` recibe score negativo, When se construye, Then lanza `InvalidArgumentError`.
- S9: Given `ProgressVersion` recibe un valor negativo, When se construye, Then lanza `InvalidArgumentError`.
- S10: Given cualquier error `DomainError` llega al errorMiddleware, When Express lo procesa, Then responde 422 con body estándar (`code`, `message`, `success: false`).
- S11: Given `src/domain`, When se inspeccionan imports de `AppError` y referencias a `httpStatus`, Then no aparece ninguna.
- S12: Given `SubmitScoreService` recibe score negativo, When ejecuta, Then el error proviene del VO (no de la validación duplicada eliminada) y la respuesta final es 422.

## Decisions

1. **`DomainError` extiende `Error` directamente** — alternativa descartada: mantenerlo en `AppError`
   con `httpStatus = 422` hardcodeado. Descartada porque sigue siendo un leak: el dominio conoce el número 422.

2. **Mapping en `DomainErrorMapper` estático en framework** — alternativa descartada: poner el mapping
   en el propio `DomainError` como método abstracto `toHttpStatus()`. Descartada porque ese método
   violaría la independencia del dominio (el dominio decide su representación HTTP).

3. **Todos los `DomainError` actuales mapean a 422** — ambas subclases (`InvalidArgumentError`,
   `BusinessRuleViolationError`) representan rechazos de invariantes. 422 es el status semánticamente
   correcto para "la entidad fue bien formada pero viola una regla de dominio".

4. **`SubmitScoreService` elimina validaciones duplicadas** — confía en los VOs. Si en el futuro
   un VO cambia su regla, solo cambia en un lugar.

## Risks / OPEN QUESTIONS

- Ninguno: el alcance está bien delimitado y el comportamiento externo (HTTP 422 para inputs
  inválidos) no cambia.
