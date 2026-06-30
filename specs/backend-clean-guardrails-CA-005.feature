Feature: Backend architectural guardrails and structural cleanup (CA-005)
  As a backend developer
  I want ESLint to block domain-layer regressions and port filenames to be consistent
  So that architectural rules are enforced automatically and the codebase is easy to navigate

  Background:
    Given the project is at the root of arrow-maze-backend
    And `npm run verify` passes before any change

  @s1
  Scenario: ESLint blocks crypto import in domain (bare specifier)
    Given a TypeScript file in src/domain/ contains the line
      """
      import { randomUUID } from 'crypto';
      """
    When `npm run lint` is executed
    Then the process exits with a non-zero code
    And the output contains a lint error referencing the crypto import

  @s2
  Scenario: ESLint blocks crypto import in domain (node: protocol)
    Given a TypeScript file in src/domain/ contains the line
      """
      import { randomUUID } from 'node:crypto';
      """
    When `npm run lint` is executed
    Then the process exits with a non-zero code
    And the output contains a lint error referencing the crypto import

  @s3
  Scenario: ESLint blocks AppError import in domain
    Given a TypeScript file in src/domain/ contains the line
      """
      import { AppError } from '../../shared/errors/AppError';
      """
    When `npm run lint` is executed
    Then the process exits with a non-zero code
    And the output contains a lint error referencing the AppError import

  @s4
  Scenario: Leaderboard port file has no I prefix
    Given the directory src/application/leaderboard/ports/ is listed
    When filenames are inspected
    Then no file starts with the letter "I" followed by an uppercase letter
    And the file LeaderboardRepository.ts exists
    And the file exports the type LeaderboardRepository

  @s5
  Scenario: Progress port file has no I prefix
    Given the directory src/application/progress/ports/ is listed
    When filenames are inspected
    Then no file starts with the letter "I" followed by an uppercase letter
    And the file ProgressRepository.ts exists
    And the file exports the type ProgressRepository

  @s6
  Scenario: Full verify passes after all changes
    Given all CA-005 changes have been applied
    When `npm run verify` is executed
    Then the process exits with zero
    And lint, typecheck, tests, and build all report no errors

  @s7
  Scenario: Architecture docs document the port naming convention
    Given the file docs/architecture.md is read
    When the port naming section is found
    Then it states that port files must not use an I prefix
    And it includes a correct example such as UserRepository.ts exporting UserRepository
