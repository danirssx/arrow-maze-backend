Feature: Refresh-token rotation and server-side logout
  As the Arrow Maze backend
  I want short-lived access tokens renewable via a rotating, revocable refresh token
  So that mandatory-login sessions renew gracefully and a stolen or revoked token can be invalidated

  Background:
    Given access tokens are short-lived and the access TTL is read from configuration
    And refresh tokens are opaque, stored only as a hash, and have a long TTL

  @s1
  Scenario: Login issues an access token and a rotating refresh token
    Given valid credentials for an active user
    When the user logs in
    Then the response contains an accessToken and a refreshToken
    And a refresh token is persisted as a hash for that user

  @s2
  Scenario: Refresh rotates the token
    Given a stored, active refresh token for a user
    When the client posts it to refresh
    Then a new access token and a new refresh token are returned
    And the old refresh token is revoked and marked replaced by the new one

  @s3
  Scenario: An expired refresh token is rejected
    Given a stored refresh token whose expiry is in the past
    When the client posts it to refresh
    Then the request is rejected as unauthorized
    And no new token is issued

  @s4
  Scenario: An unknown refresh token is rejected
    Given a refresh token that does not match any stored hash
    When the client posts it to refresh
    Then the request is rejected as unauthorized

  @s5
  Scenario: Reusing an already-revoked refresh token revokes the whole family
    Given a refresh token that has already been revoked
    When the client posts it to refresh
    Then the request is rejected as unauthorized
    And every active refresh token for that user is revoked

  @s6
  Scenario: Logout revokes the refresh token
    Given a stored, active refresh token for a user
    When the user logs out with that token
    Then the token is revoked
    And a later refresh with the same token is rejected as unauthorized

  @s7
  Scenario: A refresh token is active only when neither revoked nor expired
    Given a refresh token issued now with a positive TTL
    Then it is active at the issue time
    And it is not active once revoked
    And it is not active once its expiry has passed
