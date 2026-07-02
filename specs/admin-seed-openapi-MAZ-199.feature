Feature: Admin seed user and admin API documentation
  The backend seeds a documented local/dev ADMIN account and documents the
  existing /admin/* read endpoints for the admin dashboard.

  @s1
  Scenario: Seed credentials include one active admin user
    Given the demo seed credentials
    When they are inspected
    Then one credential has email "admin@arrowmaze.test"
    And that credential has username "admin_arrow"
    And that credential has role "ADMIN"
    And that credential has status "ACTIVE"
    And every seeded id, email, and username is unique
    And the admin password is a valid raw password

  @s2
  Scenario: Admin seed password uses bcrypt cost 12
    Given the documented admin password "ArrowDemo!Admin"
    When the seed hashes it with the configured demo bcrypt cost
    Then the hash cost is 12
    And the app password hasher verifies the documented password

  @s3
  Scenario: Seeded admin login returns ADMIN role
    Given the seeded admin credential
    When the existing login contract is exercised with its email and password
    Then the login response contains role "ADMIN"

  @s4
  Scenario: OpenAPI documents GET /admin/levels with bearer auth
    Given the OpenAPI spec
    When the path GET /admin/levels is inspected
    Then it requires bearerAuth
    And it documents the optional status query parameter
    And its success response includes admin level summaries with status

  @s5
  Scenario: OpenAPI documents GET /admin/users with bearer auth and no password hash
    Given the OpenAPI spec
    When the path GET /admin/users is inspected
    Then it requires bearerAuth
    And it documents page and limit query parameters
    And its success response includes users, page, limit, and total
    And it does not document passwordHash

  @s6
  Scenario: README documents admin local/dev access
    Given the README local setup docs
    When the demo credentials and endpoint list are inspected
    Then the admin credential is listed as local/dev and non-secret
    And GET /admin/levels is listed
    And GET /admin/users is listed
