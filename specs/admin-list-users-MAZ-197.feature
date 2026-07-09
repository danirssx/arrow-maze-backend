Feature: List platform users for the admin dashboard
  An ADMIN can read a paginated list of users. The response never exposes password
  hashes and offers no mutations.

  @s1
  Scenario: Admin lists users without password hashes
    Given users exist
    When an ADMIN requests GET /admin/users
    Then the API responds with HTTP 200
    And the users and pagination metadata are returned
    And no user exposes its passwordHash

  @s2
  Scenario: Pagination applies page and limit
    Given users exist
    When an ADMIN requests GET /admin/users?page=2&limit=5
    Then the repository is queried with offset 5 and limit 5
    And the response echoes page 2 and limit 5

  @s3
  Scenario: Default pagination
    Given users exist
    When an ADMIN requests GET /admin/users with no query
    Then page 1 and limit 20 are used

  @s4
  Scenario: Reject an invalid pagination value
    Given an ADMIN
    When it requests GET /admin/users?page=0
    Then the API responds with HTTP 400
    And the error code is "BAD_REQUEST"

  @s5
  Scenario: Reject a non-admin
    Given an authenticated USER
    When it requests GET /admin/users
    Then the API responds with HTTP 403

  @s6
  Scenario: Reject an anonymous request
    Given no Bearer token
    When requesting GET /admin/users
    Then the API responds with HTTP 401
