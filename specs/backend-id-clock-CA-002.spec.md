# Spec — Backend: sacar generación de IDs y reloj real del dominio (CA-002)

Date: 2026-06-24
Ticket: `MAZ-155` (temporary id `CA-002`)
Source: Clean Architecture Fix Tickets — B-Y1, B-Y2
Status: approved. Los escenarios `@s` en `specs/backend-id-clock-CA-002.feature` son el contrato ejecutable.

## Purpose

Eliminar dos dependencias de infraestructura del dominio: la generación de IDs con
`crypto.randomUUID()` y la lectura del reloj real con `new Date()`.

Seis VOs de identidad importan `crypto` y exponen `static generate()`. Cuatro VOs de
timestamp (`CompletedAt`, `UpdatedAt`×2, `SubmittedAt`) tienen `static now()` que llama
`new Date()` internamente. Los agregados `User`, `Level`, `PlayerProgress`, `Leaderboard`,
`CompletedLevel`, `ProgressMergePolicy` y la clase base `DomainEvent` llaman `new Date()`
directamente o a través de esos VOs. Además, `UserFactory` (dominio) y
`PlayerProgress.recordCompletion()` (agregado) generan sus propios IDs con `generate()`.

El resultado es que el dominio no puede ser probado con timestamps ni IDs determinísticos
sin parchear el reloj del sistema o mockear `crypto` — lo cual viola su independencia
respecto a infraestructura.

## In scope / Out of scope

- In scope:
  - Remover `import { randomUUID } from 'crypto'` y `static generate()` de los 6 ID VOs:
    `UserId`, `LevelId`, `EntryId`, `LeaderboardId`, `CompletedLevelId`, `ProgressId`.
  - Remover `static now()` de los 4 VOs de timestamp: `CompletedAt`, `UpdatedAt` (progress),
    `UpdatedAt` (leaderboard), `SubmittedAt`.
  - Eliminar todos los `new Date()` de los agregados: `User`, `Level`, `PlayerProgress`,
    `Leaderboard`, `CompletedLevel`, `ProgressMergePolicy`, y de la clase base `DomainEvent`.
  - Agregar `now: Date` como parámetro a todos los métodos de dominio que actualmente
    crean timestamps internamente.
  - Pasar `CompletedLevelId` como parámetro a `PlayerProgress.recordCompletion()` en
    lugar de generarlo dentro del agregado.
  - Pasar `UserId` como primer parámetro a `UserFactory.create()`.
  - Agregar `occurredOn: Date` como parámetro al constructor de `DomainEvent`; actualizar
    los 7 eventos concretos derivados.
  - Crear el puerto `IdGenerator` en `src/application/ports/IdGenerator.ts`.
  - Crear el puerto `Clock` en `src/application/ports/Clock.ts`.
  - Crear los adaptadores `UuidIdGenerator` y `SystemClock` en
    `src/infrastructure/shared/`.
  - Inyectar `IdGenerator` y `Clock` en los use-cases afectados: `RegisterUserUseCase`,
    `CreateLevelUseCase`, `PublishLevelUseCase`, `UpdateLevelDefinitionUseCase`,
    `ArchiveLevelUseCase`, `LoadProgressService`, `CompleteLevelService`,
    `SyncProgressService`, `SubmitScoreService`.
  - Actualizar el wiring en `src/framework/app.ts`.
  - Actualizar todos los tests de dominio y aplicación afectados.

- Out of scope:
  - Cambiar el formato de IDs (sigue siendo UUID v4).
  - Cambiar cualquier regla de negocio.
  - Modificar los tests de API (salvo que TypeScript lo requiera por firma).
  - Tocar CA-001 (error hierarchy), CA-003 (ADMIN auth), o CA-005 (lint rules).

## Behavior

El dominio pasa a ser determinístico: todos los métodos de fábrica y mutación aceptan los
valores externamente provistos (IDs y timestamps) en lugar de generarlos por cuenta propia.

`DomainEvent(aggregateId, occurredOn: Date)` recibe el timestamp como parámetro obligatorio.
Los agregados que registran eventos pasan el `now` que recibieron como argumento.

Los puertos `IdGenerator` y `Clock` viven en `src/application/ports/`. Los use-cases los
reciben por inyección de constructor. Los adaptadores `UuidIdGenerator` (usa `randomUUID`)
y `SystemClock` (usa `new Date()`) viven en `src/infrastructure/shared/` y se instancian
una sola vez en `app.ts`.

El comportamiento observable de la API (endpoints, IDs generados, timestamps guardados en
BD) es idéntico al actual.

## HTTP contract

No se crean ni modifican endpoints. El comportamiento HTTP no cambia.

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

- Domain: eliminar `crypto` + `generate()` de 6 ID VOs; eliminar `now()` de 4 timestamp
  VOs; agregar `now: Date` param a métodos de `User`, `Level`, `PlayerProgress`,
  `CompletedLevel`, `Leaderboard`, `ProgressMergePolicy`; agregar `occurredOn: Date` a
  `DomainEvent` y a los 7 eventos concretos; agregar `id: UserId` param a
  `UserFactory.create()`.
- Application: dos nuevos puertos (`IdGenerator`, `Clock`); inyectar en 9 use-cases.
- Infrastructure: dos nuevos adaptadores (`UuidIdGenerator`, `SystemClock`).
- Framework: actualizar wiring en `app.ts`.

Forbidden moves (must stay unchecked / not introduced):

- [ ] `src/domain` importing `application`/`infrastructure`/`framework`, `shared/errors/AppError`, `crypto`, or exposing `httpStatus`
- [ ] `src/application` importing `infrastructure`/`framework`
- [ ] Controllers/middleware containing business rules or domain authorization
- [ ] DTOs exposing domain entities, `Date`, or runtime objects
- [ ] Persistence/Prisma client used outside `src/infrastructure`

Required tests:

- Domain: un test por método que recibe `now: Date` — verifica que el timestamp almacenado
  en el agregado es exactamente el que se pasó como argumento (no `new Date()`). Un test
  para `recordCompletion()` verifica que el `CompletedLevel.id` creado iguala el
  `CompletedLevelId` inyectado. Un test para `DomainEvent` con `occurredOn` fijo.
- Application: tests de use-cases con mocks de `IdGenerator` y `Clock` — verifican que
  los IDs y timestamps generados fluyen correctamente al dominio.
- Infrastructure: test de `UuidIdGenerator.generate()` retorna UUID v4 válido; test de
  `SystemClock.now()` retorna `Date` reciente.

Architecture acceptance criteria:

- Given `src/domain` is inspected for `crypto` imports, When grepped, Then zero matches.
- Given `src/domain` is inspected for `new Date()` calls, When grepped, Then zero matches.
- Given domain methods are called with a fixed injected date, When the result is inspected,
  Then stored timestamps match the injected date exactly.

## Edge cases

- `PlayerProgress.recordCompletion()` en loop (`SyncProgressService`): cada iteración
  recibe un `CompletedLevelId` distinto generado por el `IdGenerator` del use-case.
- `PlayerProgress.empty()` reutilizando `remote.id` (en `SyncProgressService`): no se
  genera ID nuevo — siempre recibe el ID como parámetro.
- `Leaderboard.empty()` cuando no existe leaderboard para el nivel: el use-case captura
  `now = clock.now()` al inicio de `execute()` y lo pasa al agregado.
- Múltiples eventos en una sola ejecución de use-case: todos comparten el mismo `now`
  capturado al inicio de `execute()` — semánticamente correcto (una transacción = un
  instante).

## Acceptance criteria (Given/When/Then)

- S1: Given `src/domain` is grepped for `from 'crypto'` or `from "crypto"`, When the
  search runs, Then zero matches are found.
- S2: Given `src/domain` is grepped for `new Date()`, When the search runs, Then zero
  matches are found.
- S3: Given `User.register()` is called with a fixed `UserId` and a fixed `now` date,
  When the User is created, Then `user.createdAt` and `user.updatedAt` equal the injected
  date exactly.
- S4: Given `Level.draft()` is called with a fixed `now` date, When the Level is created,
  Then `level.createdAt` and `level.updatedAt` equal the injected date exactly.
- S5: Given `PlayerProgress.recordCompletion()` is called with a fixed `CompletedLevelId`
  and a fixed `now` date, When the completion is recorded, Then the new
  `CompletedLevel.id` equals the injected ID and `progress.updatedAt.value` equals the
  injected date.
- S6: Given `Leaderboard.submitEntry()` is called with a fixed `now` date, When the entry
  is submitted, Then `leaderboard.updatedAt.value` equals the injected date.
- S7: Given a concrete `DomainEvent` is instantiated with a fixed `occurredOn` date, When
  `event.occurredOn` is read, Then it equals the injected date.
- S8: Given `RegisterUserUseCase` is constructed with a mock `IdGenerator` returning a
  known UUID string, When `execute()` is called, Then the User saved to the repository
  has `id.value` equal to that UUID.
- S9: Given `UuidIdGenerator.generate()` is called, When the result is inspected, Then it
  matches the UUID v4 regex.
- S10: Given `SystemClock.now()` is called, When the result is inspected, Then it is a
  `Date` instance.
- S11: Given the full diff, When `npm run verify` is run, Then zero test failures and
  clean build.

## Decisions

1. **Puertos en `application/ports/`, no en `domain/`** — alternativa descartada: un
   interface `Clock` o `IdFactory` en el dominio. Descartada porque el dominio no necesita
   ningún puerto para esto: los valores se pasan como parámetros primitivos (`Date`,
   `string`). El dominio permanece sin ninguna dependencia externa.

2. **`now: Date` como parámetro directo en métodos del dominio** — alternativa descartada:
   inyectar `Clock` en los agregados por constructor. Descartada porque los agregados son
   entidades DDD stateful, no servicios — no tienen dependencias inyectadas por
   constructor. Pasar `now` por parámetro es el patrón DDD estándar.

3. **`occurredOn: Date` requerido en `DomainEvent`** — alternativa descartada: mantener
   `new Date()` por defecto. Descartada porque la intención de CA-002 es eliminar todos
   los `new Date()` del dominio; un `new Date()` en la clase base de eventos violaría el
   objetivo y lo dejaría indetectable por grep.

4. **`UserFactory.create(id, email, username, passwordHash, role)`** — el `UserId` pasa a
   ser el primer parámetro. Alternativa descartada: eliminar `UserFactory` y delegar todo
   al use-case. Descartada porque `UserFactory` sigue siendo un Factory válido de dominio;
   solo deja de generar IDs propios.

5. **`CompletedLevelId` como parámetro de `recordCompletion()`** — alternativa descartada:
   inyectar un `IdGenerator` en el agregado `PlayerProgress`. Descartada porque los
   agregados no reciben puertos por DI — el use-case es quien orquesta y provee el ID.

## Risks / OPEN QUESTIONS

- **Cascada en tests existentes**: los tests de dominio que crean `User`, `Level`,
  `PlayerProgress`, `Leaderboard` o eventos sin pasar `now`/ID fallarán en la fase Roja —
  el `tdd-implementer` los detecta y actualiza como parte del ciclo TDD.
- **Múltiples IDs en loop de `SyncProgressService`**: se generan N `CompletedLevelId`
  distintos (uno por nivel en el DTO de sincronización) — correcto y esperado.
