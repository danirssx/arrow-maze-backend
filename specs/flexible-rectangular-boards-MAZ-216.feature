Feature: Flexible rectangular board definitions in backend admin level creation
  As the backend authority for level definitions
  I want to validate explicit rectangular board dimensions
  So that admin-authored M12 levels stay within mobile-safe limits

  Background:
    Given admin create-level requests already validate ArrowSpec and optional boardShape
    And mobile already understands definition.boardShape for framed boards

  @s1
  Scenario: Valid non-preset rectangle is created and stored as a full mask
    Given an admin create request with boardSize rows 8 and cols 10
    And all arrows are inside rows 0 through 7 and cols 0 through 9
    When the backend creates the level
    Then it returns a successful create response
    And the persisted level has a full rectangular CELL_MASK boardShape

  @s2
  Scenario: Existing create requests without boardSize keep working
    Given an admin create request with arrows and no boardSize
    When the backend creates the level
    Then the existing create-level behavior is preserved

  @s3
  Scenario: Oversize board dimensions are rejected
    Given an admin create request with boardSize rows 13 or cols 13
    When the backend validates the request
    Then it returns a controlled validation error
    And no level is persisted

  @s4
  Scenario: More than sixty arrows are rejected
    Given an admin create request with 61 arrows
    When the backend validates the request
    Then it returns a controlled validation error
    And no level is persisted

  @s5
  Scenario: Arrow cells outside the declared rectangle are rejected
    Given an admin create request with boardSize rows 4 and cols 4
    And an arrow path contains row 4 or col 4
    When the backend validates the request
    Then it returns a controlled validation error
    And no level is persisted

  @s6
  Scenario: Rectangular and irregular authoring inputs are not mixed
    Given an admin create request with both boardSize and boardShape
    When the backend validates the request
    Then it returns a controlled validation error
    And no level is persisted

  @s7
  Scenario: OpenAPI documents rectangular board input
    Given the exported OpenAPI specification
    When CreateLevelRequest is inspected
    Then it includes boardSize rows and cols
    And it documents the 12 by 12 and 60 arrow limits
