Feature: Progress timestamp and referential integrity
  Backend progress writes must reject invalid completion timestamps and the
  database must prevent orphan progress or leaderboard rows.

  @s1
  Scenario: Reject an invalid completedAt on level completion
    Given an authenticated player completes a level
    When the request body contains completedAt "not-a-date"
    Then the API responds with HTTP 422
    And the error code is "INVALID_ARGUMENT"
    And the complete-level use case does not save a completion

  @s2
  Scenario: Reject an invalid completedAt during progress sync
    Given a progress sync payload with one completed level
    When that completed level contains completedAt "not-a-date"
    Then the sync use case rejects the payload
    And no merged progress is persisted

  @s3
  Scenario: Define database foreign keys for progress and leaderboard ownership
    Given the MAZ-176 Prisma migration
    When the migration is inspected
    Then leaderboard entries reference existing users
    And player progress references existing users
    And leaderboards reference existing levels
    And completed levels reference existing levels
