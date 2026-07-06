Feature: Level catalog mutation authorization

  The level catalog must allow public reads while requiring ADMIN authorization
  for every mutation so regular authenticated users cannot change authored
  levels.

  @s1
  Scenario: Anonymous users cannot mutate the level catalog
    Given no bearer token is provided
    When the client requests a level-catalog mutation endpoint
    Then the API responds with status 401
    And the response error code is "UNAUTHORIZED"

  @s2
  Scenario: Authenticated non-admin users cannot mutate the level catalog
    Given a bearer token for a user with role "USER"
    When the client requests any level-catalog mutation endpoint
    Then the API responds with status 403
    And the response error code is "FORBIDDEN"
    And the level catalog is not mutated

  @s3
  Scenario: Admin users can create a draft level
    Given a bearer token for a user with role "ADMIN"
    And a valid level creation payload
    When the client posts the payload to "/levels"
    Then the API responds with status 201
    And the response contains the created level id

  @s4
  Scenario: Admin users can update a level definition
    Given a bearer token for a user with role "ADMIN"
    And a valid level definition payload
    When the client puts the payload to "/levels/:levelId/definition"
    Then the API responds with status 200
    And the response contains the level id

  @s5
  Scenario: Admin users can publish a level
    Given a bearer token for a user with role "ADMIN"
    And an existing draft level
    When the client posts to "/levels/:levelId/publish"
    Then the API responds with status 200
    And the response contains the level id

  @s6
  Scenario: Admin users can archive a level
    Given a bearer token for a user with role "ADMIN"
    And an existing level
    When the client posts to "/levels/:levelId/archive"
    Then the API responds with status 200
    And the response contains the level id

  @s7
  Scenario: Level-catalog authorization is enforced outside the framework adapter
    Given the backend source is inspected
    When framework level-catalog controllers and routes are searched for ADMIN role decisions
    Then no level-catalog mutation authorization decision is made in the framework layer
    And the application layer rejects non-admin mutation inputs before persistence
