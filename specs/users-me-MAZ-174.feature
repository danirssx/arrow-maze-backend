Feature: Expose the authenticated user's profile via GET /users/me
  As a logged-in Arrow Maze player
  I want to fetch my own profile from my access token
  So that the mobile app can rehydrate and validate my session on relaunch

  Background:
    Given the Identity HTTP API is mounted
    And GET /users/me is protected by the Bearer auth middleware

  @s1
  Scenario: Valid token returns the authenticated user's profile
    Given a registered active user with id "550e8400-e29b-41d4-a716-446655440000", email "alice@example.com", username "alice" and role "USER"
    And a valid Bearer access token for that user
    When the client sends GET /users/me with the token
    Then the response status is 200
    And the response body has status "success"
    And data contains userId "550e8400-e29b-41d4-a716-446655440000", email "alice@example.com", username "alice" and role "USER"

  @s2
  Scenario: The profile response never leaks the password hash
    Given a registered active user with a stored password hash
    And a valid Bearer access token for that user
    When the client sends GET /users/me with the token
    Then the response status is 200
    And data has no "passwordHash" property

  @s3
  Scenario: Missing token is rejected
    When the client sends GET /users/me without an Authorization header
    Then the response status is 401
    And the response body has status "error"
    And error code is "UNAUTHORIZED"

  @s4
  Scenario: Invalid or expired token is rejected
    When the client sends GET /users/me with an invalid Bearer token
    Then the response status is 401
    And error code is "UNAUTHORIZED"

  @s5
  Scenario: Valid token whose user no longer exists returns 404
    Given a valid Bearer token whose userId does not match any stored user
    When the client sends GET /users/me with the token
    Then the response status is 404
    And error code is "NOT_FOUND"

  @s6
  Scenario: Use case returns a plain profile DTO for an existing user
    Given a GetCurrentUserUseCase backed by a repository holding user "550e8400-e29b-41d4-a716-446655440000"
    When execute is called with that userId
    Then it returns userId, email, username and role
    And the returned object has no passwordHash field

  @s7
  Scenario: Use case rejects a non-existent user
    Given a GetCurrentUserUseCase backed by an empty repository
    When execute is called with a well-formed userId
    Then it throws NotFoundError with code NOT_FOUND

  @s8
  Scenario: Use case treats a malformed token userId as unauthenticated
    Given a GetCurrentUserUseCase
    When execute is called with a userId that is not a valid UUID
    Then it throws UnauthorizedError with code UNAUTHORIZED
    And the repository is never queried
