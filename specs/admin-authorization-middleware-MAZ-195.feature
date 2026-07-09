Feature: requireAdmin route-level authorization
  A coarse transport guard lets only authenticated ADMIN users reach /admin/* routes,
  running after authMiddleware.

  @s1
  Scenario: Reject an anonymous request
    Given no Bearer token
    When a request hits an admin route guarded by requireAdmin
    Then the API responds with HTTP 401

  @s2
  Scenario: Reject an authenticated non-admin
    Given an authenticated USER
    When the request hits an admin route guarded by requireAdmin
    Then the API responds with HTTP 403
    And the error code is "FORBIDDEN"

  @s3
  Scenario: Allow an authenticated admin
    Given an authenticated ADMIN
    When the request hits an admin route guarded by requireAdmin
    Then the guard calls next and the handler runs
    And the API responds with HTTP 200

  @s4
  Scenario: Reject a request with no authenticated user (defensive)
    Given requireAdmin receives a request with no authenticated user
    When it runs
    Then it forwards an UnauthorizedError
