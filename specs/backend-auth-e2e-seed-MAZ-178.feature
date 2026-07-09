Feature: Usable seeded credentials + a real register→login→authed E2E
  As the team demonstrating and verifying mandatory login
  We want documented demo credentials and a real end-to-end auth test
  So that the demo users can log in and the critical auth chain is verified

  @s1
  Scenario: Each documented demo credential is a valid password
    Given the documented demo user credentials
    When each password is validated as a RawPassword
    Then no validation error is thrown

  @s2
  Scenario: A demo password round-trips through a cost-12 bcrypt hash
    Given a documented demo password
    When it is hashed at the seed cost and then verified
    Then the verification succeeds
    And the seed bcrypt cost is 12

  @s3
  Scenario: Registering a new user succeeds end to end
    Given a fresh in-memory auth app
    When a user registers with an email, username, and password
    Then the response status is 201 with a userId

  @s4
  Scenario: Logging in with the correct password returns a token
    Given a registered user
    When they log in with the correct password
    Then the response status is 200 with an accessToken

  @s5
  Scenario: The token authenticates a request to the current-user endpoint
    Given a valid access token from login
    When GET /users/me is called with the bearer token
    Then the response status is 200 with the user's id, email, username, and role

  @s6
  Scenario: Logging in with the wrong password is rejected
    Given a registered user
    When they log in with the wrong password
    Then the response status is 401
