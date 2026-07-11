Feature: Backend daily challenge generation and cache contract
  As the backend authority for generated Arrow Untangle content
  I want to generate, validate, cache, and serve one daily challenge per UTC date
  So that mobile can consume a safe first-party daily puzzle without any Gemini secret

  Background:
    Given the backend clock is the authority for the current UTC date
    And Gemini is available only through backend infrastructure
    And generated candidates are validated through level-catalog domain rules

  @s1
  Scenario: Gemini integration remains backend-only
    Given the backend daily challenge feature is implemented
    When mobile and admin repositories are inspected
    Then no Gemini API key is present outside backend configuration
    And no mobile or admin code calls Gemini directly
    And mobile consumes only the backend daily challenge endpoint

  @s2
  Scenario: First request generates, validates, caches, and returns a Gemini challenge
    Given no daily challenge is cached for UTC date "2026-07-10"
    And Gemini returns a structurally valid candidate for seed "daily-2026-07-10"
    And the candidate matches the target difficulty
    And the candidate is solvable
    When the client requests GET /daily-challenge
    Then the response status is 200
    And the response body contains date "2026-07-10"
    And the response body contains source "gemini"
    And the response body contains a full level definition
    And the validated challenge is cached for UTC date "2026-07-10"

  @s3
  Scenario: Repeated request for the same UTC date returns cache without calling Gemini
    Given a valid daily challenge is cached for UTC date "2026-07-10"
    When the client requests GET /daily-challenge during UTC date "2026-07-10"
    Then the response status is 200
    And the response body equals the cached challenge payload
    And Gemini is not called

  @s4
  Scenario: Malformed Gemini JSON falls back safely
    Given no daily challenge is cached for UTC date "2026-07-10"
    And Gemini returns invalid JSON or a structurally invalid level payload
    When the client requests GET /daily-challenge
    Then the response status is 200
    And the response body contains source "fallback"
    And the response body contains a validated fallback level definition
    And the response body does not contain provider errors, prompts, stack traces, or secrets
    And the fallback challenge is cached for UTC date "2026-07-10"

  @s5
  Scenario: Unsolvable Gemini candidate falls back safely
    Given no daily challenge is cached for UTC date "2026-07-10"
    And Gemini returns a candidate whose arrow blocking graph is cyclic
    When the backend validates the candidate with LevelSolvabilityPolicy
    Then the candidate is rejected
    And GET /daily-challenge responds with a validated fallback challenge

  @s6
  Scenario: Wrong date, seed, or difficulty from Gemini falls back safely
    Given no daily challenge is cached for UTC date "2026-07-10"
    And Gemini returns a candidate for a different date, seed, or target difficulty
    When the backend validates the candidate metadata
    Then the candidate is rejected
    And GET /daily-challenge responds with a validated fallback challenge

  @s7
  Scenario: UTC date rollover selects the next daily challenge
    Given a valid daily challenge is cached for UTC date "2026-07-10"
    And the backend clock advances to UTC date "2026-07-11"
    When the client requests GET /daily-challenge
    Then the response body contains date "2026-07-11"
    And the response body contains seed "daily-2026-07-11"
    And the response expiry is the next UTC midnight
    And the cache key used is "2026-07-11"

  @s8
  Scenario: Different local timezones receive the same UTC challenge
    Given two users are in different local timezones
    And the backend UTC date for both requests is "2026-07-10"
    And a valid daily challenge is cached for UTC date "2026-07-10"
    When both users request GET /daily-challenge
    Then both responses contain the same date
    And both responses contain the same seed
    And both responses contain the same level definition

  @s9
  Scenario: Total generation failure returns a sanitized service error
    Given no daily challenge is cached for UTC date "2026-07-10"
    And Gemini generation fails
    And fallback generation also fails validation
    When the client requests GET /daily-challenge
    Then the response status is 503
    And the response body is a controlled application error
    And the response body does not contain provider errors, raw payloads, stack traces, prompts, or secrets
