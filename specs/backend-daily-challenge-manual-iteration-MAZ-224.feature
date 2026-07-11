Feature: Admin manual daily challenge iteration
  As an admin dashboard operator
  I want to manually iterate the Daily Challenge and watch sanitized operation logs
  So that I can replace today's challenge safely without exposing provider secrets

  Background:
    Given MAZ-218 daily challenge generation and cache are available
    And Gemini remains available only through backend infrastructure
    And manual iteration endpoints are guarded by authMiddleware and requireAdmin

  @s1
  Scenario: Admin starts an iteration for today's UTC date when no challenge exists
    Given no daily challenge is cached for backend UTC date "2026-07-11"
    And an authenticated ADMIN is available
    And Gemini returns a structurally valid candidate for seed "daily-2026-07-11"
    When the admin posts to "/admin/daily-challenge/iterations" with no date
    Then the response status is 202
    And the response body contains an operation with status "RUNNING"
    And the operation targets UTC date "2026-07-11"
    And the operation contains a "REQUESTED" event
    And the operation eventually stores a validated daily challenge for UTC date "2026-07-11"

  @s2
  Scenario: Successful iteration replaces an existing challenge atomically
    Given a valid daily challenge is cached for UTC date "2026-07-11"
    And an authenticated ADMIN is available
    And Gemini returns a different valid candidate for seed "daily-2026-07-11"
    When the admin starts a manual iteration for UTC date "2026-07-11"
    Then the previous challenge remains available until validation succeeds
    And the operation reaches status "SUCCEEDED"
    And public GET /daily-challenge returns the newly generated challenge for UTC date "2026-07-11"
    And the operation log contains a "CACHE_REPLACED" event

  @s3
  Scenario: Gemini success logs source and validation without secrets
    Given an authenticated ADMIN starts a manual iteration
    And Gemini returns a valid daily challenge candidate
    When the operation completes
    Then the operation status is "SUCCEEDED"
    And the operation log records source "gemini"
    And the operation log records fallbackUsed false
    And the operation log records validation success
    And the operation log does not contain API keys, prompts, raw provider payloads, stack traces, or provider exception details

  @s4
  Scenario: Invalid Gemini candidate falls back and logs fallback usage
    Given an authenticated ADMIN starts a manual iteration
    And Gemini returns invalid JSON or an invalid daily challenge candidate
    And fallback generation returns a valid candidate for the target date
    When the operation completes
    Then the operation status is "SUCCEEDED"
    And the stored challenge source is "fallback"
    And the operation log contains a "FALLBACK_USED" event
    And the operation log records fallbackUsed true
    And public GET /daily-challenge returns the fallback challenge for that UTC date

  @s5
  Scenario: Total generation failure preserves the previous challenge
    Given a valid daily challenge is cached for UTC date "2026-07-11"
    And an authenticated ADMIN starts a manual iteration for UTC date "2026-07-11"
    And Gemini generation fails
    And fallback generation also fails validation
    When the operation completes
    Then the operation status is "FAILED"
    And the operation log contains a sanitized "FAILED" event
    And public GET /daily-challenge still returns the previous cached challenge
    And the operation log does not contain API keys, prompts, raw provider payloads, stack traces, or provider exception details

  @s6
  Scenario: Unauthenticated callers cannot start iteration
    Given no daily challenge iteration operation exists
    When an unauthenticated caller posts to "/admin/daily-challenge/iterations"
    Then the response status is 401
    And no operation is created
    And no generator is called

  @s7
  Scenario: Non-admin callers cannot start iteration
    Given no daily challenge iteration operation exists
    When an authenticated USER posts to "/admin/daily-challenge/iterations"
    Then the response status is 403
    And no operation is created
    And no generator is called

  @s8
  Scenario: Admin polls ordered operation events until terminal status
    Given an authenticated ADMIN started a manual iteration
    And the start response returned operation id "op-1"
    When the admin gets "/admin/daily-challenge/iterations/op-1"
    Then the response status is 200
    And the response body contains operation id "op-1"
    And the response body contains events ordered by sequence
    And the operation status is one of "RUNNING", "SUCCEEDED", or "FAILED"
    And a terminal operation includes completedAt

  @s9
  Scenario: Duplicate running iteration for the same date is rejected
    Given an operation is already "RUNNING" for UTC date "2026-07-11"
    And an authenticated ADMIN is available
    When the admin starts another manual iteration for UTC date "2026-07-11"
    Then the response status is 409
    And the response body references the running operation
    And no second generator call starts for that UTC date

  @s10
  Scenario: Invalid dates are rejected before generation
    Given an authenticated ADMIN is available
    When the admin starts manual iteration with date "not-a-date"
    Then the response status is 400
    And no operation is created
    And no generator is called

  @s11
  Scenario: Future dates are rejected before generation
    Given an authenticated ADMIN is available
    When the admin starts manual iteration with a future UTC date
    Then the response status is 400
    And no operation is created
    And no generator is called

  @s12
  Scenario: Clean Architecture and secret boundaries are preserved
    Given MAZ-224 is implemented
    When imports and response DTOs are inspected
    Then src/domain does not import application, infrastructure, framework, Prisma, Express, Gemini SDKs, or HTTP response objects
    And src/application does not import infrastructure, framework, Prisma, Express, Gemini SDKs, or environment configuration
    And iteration responses and operation logs contain only primitive records
    And iteration responses and operation logs do not expose API keys, prompts, raw provider payloads, stack traces, or provider exception details
