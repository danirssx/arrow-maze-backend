Feature: dimensions field on LevelDefinition and Level (MAZ-230)

  @s1
  Scenario: All arrows at z=0 yields dimensions=2
    Given a LevelDefinition with arrows whose every path cell has z=0
    When dimensions is read
    Then the result is 2

  @s2
  Scenario: Any arrow with a z!=0 cell yields dimensions=3
    Given a LevelDefinition with one arrow whose path contains Position(0,0,1)
    When dimensions is read
    Then the result is 3

  @s3
  Scenario: Mix of 2D and 3D arrows yields dimensions=3
    Given a LevelDefinition with one planar arrow (all z=0) and one 3D arrow (z=1)
    When dimensions is read
    Then the result is 3

  @s4
  Scenario: Level.dimensions delegates to its definition
    Given a Level drafted with a 2D LevelDefinition
    When Level.dimensions is read
    Then the result is 2

  @s5
  Scenario: Level.dimensions updates after updateDefinition replaces the definition
    Given a Level drafted with a 2D LevelDefinition
    When updateDefinition() is called with a 3D LevelDefinition
    Then Level.dimensions returns 3
