Feature: Tolerate mobile clock skew for completedAt
  Backend progress completion accepts a completedAt that is only slightly ahead of
  the server clock (device clock skew), but still rejects a clearly invalid
  far-future timestamp.

  @s1
  Scenario: Accept a completedAt slightly ahead of the server clock
    Given a completedAt one minute ahead of the server clock
    When the CompletedAt value object is constructed
    Then it is accepted as valid

  @s2
  Scenario: Reject a completedAt far in the future
    Given a completedAt ten minutes ahead of the server clock
    When the CompletedAt value object is constructed
    Then it throws an InvalidArgumentError

  @s3
  Scenario: Reject a non-parseable completedAt
    Given a completedAt that is not a valid date
    When the CompletedAt value object is constructed
    Then it throws an InvalidArgumentError

  @s4
  Scenario: Complete a level with a slightly skewed timestamp does not get stuck
    Given an authenticated player completes a level
    When the request body contains a completedAt one minute in the future
    Then the API responds with HTTP 201
    And the complete-level use case saves the completion

  @s5
  Scenario: Complete a level with a far-future timestamp is rejected
    Given an authenticated player completes a level
    When the request body contains a completedAt one hour in the future
    Then the API responds with HTTP 422
    And the error code is "INVALID_ARGUMENT"
    And the complete-level use case does not save a completion
