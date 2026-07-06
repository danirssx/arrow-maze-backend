Feature: CA-002 — Sacar generación de IDs y reloj real del dominio
  Como equipo de desarrollo,
  Queremos que el dominio sea independiente de `crypto` y `Date` reales,
  Para poder probarlo con IDs y timestamps determinísticos sin mockear infraestructura.

  Background:
    Given el proyecto sigue Clean Architecture (domain → application → infrastructure → framework)

  @s1
  Scenario: El dominio no importa crypto
    Given el directorio `src/domain` del proyecto
    When se busca el patrón `from 'crypto'` o `from "crypto"` con grep
    Then no se encuentra ningún match

  @s2
  Scenario: El dominio no llama new Date()
    Given el directorio `src/domain` del proyecto
    When se busca el patrón `new Date()` con grep
    Then no se encuentra ningún match

  @s3
  Scenario: User.register() usa el timestamp inyectado
    Given un UserId fijo "11111111-1111-4111-a111-111111111111"
    And una fecha fija `now` = new Date("2024-01-15T10:00:00.000Z")
    When se llama a User.register(id, email, username, passwordHash, role, now)
    Then user.createdAt es igual a now
    And user.updatedAt es igual a now

  @s4
  Scenario: Level.draft() usa el timestamp inyectado
    Given una fecha fija `now` = new Date("2024-01-15T10:00:00.000Z")
    When se llama a Level.draft(id, name, description, definition, difficulty, version, undefined, undefined, now)
    Then level.createdAt es igual a now
    And level.updatedAt es igual a now

  @s5
  Scenario: PlayerProgress.recordCompletion() usa el ID y timestamp inyectados
    Given un PlayerProgress vacío con id y userId fijos
    And un CompletedLevelId fijo "22222222-2222-4222-a222-222222222222"
    And una fecha fija `now` = new Date("2024-01-15T10:00:00.000Z")
    And un LevelCompletionResult válido
    When se llama a progress.recordCompletion(result, completedLevelId, now)
    Then progress.completedLevels tiene un entry cuyo id.value es "22222222-2222-4222-a222-222222222222"
    And progress.updatedAt.value es igual a now

  @s6
  Scenario: Leaderboard.submitEntry() actualiza updatedAt con el timestamp inyectado
    Given un Leaderboard con un entry existente
    And una fecha fija `now` = new Date("2024-01-15T10:00:00.000Z")
    And un ScoreEntry válido para un userId distinto
    When se llama a leaderboard.submitEntry(entry, now)
    Then leaderboard.updatedAt.value es igual a now

  @s7
  Scenario: DomainEvent almacena el occurredOn inyectado
    Given una fecha fija `occurredOn` = new Date("2024-01-15T10:00:00.000Z")
    When se instancia cualquier evento concreto (p.ej. UserRegistered) con occurredOn
    Then event.occurredOn es igual a occurredOn

  @s8
  Scenario: RegisterUserUseCase usa el ID generado por IdGenerator
    Given un mock de IdGenerator que retorna "33333333-3333-4333-a333-333333333333"
    And un mock de Clock que retorna new Date("2024-01-15T10:00:00.000Z")
    And mocks de UserRepository (sin conflictos) y PasswordHasher
    When se ejecuta RegisterUserUseCase.execute({ email, username, rawPassword })
    Then el User guardado en el repositorio tiene id.value "33333333-3333-4333-a333-333333333333"

  @s9
  Scenario: UuidIdGenerator genera un UUID v4 válido
    Given una instancia de UuidIdGenerator
    When se llama a generate()
    Then el resultado satisface el regex UUID v4
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  @s10
  Scenario: SystemClock retorna una instancia de Date
    Given una instancia de SystemClock
    When se llama a now()
    Then el resultado es una instancia de Date

  @s11
  Scenario: El verify completo pasa sin regresiones
    Given el diff completo del branch CA-002 aplicado
    When se corre npm run verify
    Then el exit code es 0 (lint, typecheck, tests y build verdes)
