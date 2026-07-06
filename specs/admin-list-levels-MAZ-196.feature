Feature: List all levels for the admin dashboard
  An ADMIN can list every level (DRAFT, PUBLISHED, ARCHIVED) with its status, optionally
  filtered by status. The public GET /levels (published only) is unchanged.

  @s1
  Scenario: Admin lists every level with its status
    Given levels exist in every status
    When an ADMIN requests GET /admin/levels
    Then the API responds with HTTP 200
    And every level is returned with its status

  @s2
  Scenario: Filter by status
    Given levels exist in every status
    When an ADMIN requests GET /admin/levels?status=DRAFT
    Then only DRAFT levels are returned

  @s3
  Scenario: Reject a non-admin
    Given an authenticated USER
    When it requests GET /admin/levels
    Then the API responds with HTTP 403

  @s4
  Scenario: Reject an anonymous request
    Given no Bearer token
    When requesting GET /admin/levels
    Then the API responds with HTTP 401

  @s5
  Scenario: Reject an unknown status filter
    Given an ADMIN
    When it requests GET /admin/levels?status=NONSENSE
    Then the API responds with HTTP 400
    And the error code is "BAD_REQUEST"
