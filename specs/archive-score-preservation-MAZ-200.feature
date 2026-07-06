Feature: Archive preserves score and progress history
  The backend archives levels as a soft state change so the game hides archived
  levels while leaderboard and progress history remain readable.

  @s1
  Scenario: Archive changes only the level state
    Given a published level with leaderboard and progress history
    When an admin archives the level
    Then the level is saved with status "ARCHIVED"
    And leaderboard history is not deleted
    And progress history is not deleted

  @s2
  Scenario: Public catalog hides archived levels
    Given a level was archived
    When the public level catalog is requested
    Then the archived level is not listed

  @s3
  Scenario: Leaderboard remains readable for archived level with entries
    Given an archived level has leaderboard entries
    When GET /leaderboard/:levelId is requested
    Then the response is 200
    And the existing entries are returned

  @s4
  Scenario: Known archived level with no leaderboard returns empty entries
    Given an archived level has no leaderboard yet
    When GET /leaderboard/:levelId is requested
    Then the response is 200
    And entries is an empty array

  @s5
  Scenario: Persistence rules restrict history deletion from levels
    Given a level has leaderboard and completed-progress history
    When persistence relations are inspected
    Then leaderboard rows are not cascade-deleted by level deletion
    And completed level rows are not cascade-deleted by level deletion

  @s6
  Scenario: Public catalog and leaderboard diverge intentionally for archived levels
    Given the same archived level has leaderboard entries
    When GET /levels and GET /leaderboard/:levelId are requested
    Then GET /levels does not include the level
    And GET /leaderboard/:levelId returns the entries
