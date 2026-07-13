Feature: RandomLevelStrategy generates solvable 3D levels (MAZ-231)

  @s1
  Scenario: 3D board shape generates a solvable level
    Given a BoardShape covering a 2x2 grid at z=0 and z=1 (4 cells per layer, 8 total)
    And arrowCount=2, maxArrowLength=2, seed="3d-basic"
    When generate() is called
    Then ok is true
    And all arrow cells are contained in the board shape
    And LevelSolvabilityPolicy reports the definition as solvable

  @s2
  Scenario: z-axis-only column forces FORWARD or BACK direction
    Given a BoardShape with only positions [0,0,0], [0,0,1], [0,0,2]
    And arrowCount=1, maxArrowLength=2, seed="z-col"
    When generate() is called
    Then ok is true
    And the single arrow's direction is FORWARD or BACK

  @s3
  Scenario: 2D board unchanged - same seed still produces the pre-B5 known layout
    Given BoardShape grid(5,5) with seed="alpha", arrowCount=3, maxArrowLength=2
    When generate() is called after B5
    Then the result equals:
      | id      | direction | path              |
      | arrow-0 | DOWN      | [2,2,0]->[3,2,0]  |
      | arrow-1 | LEFT      | [4,4,0]           |
      | arrow-2 | RIGHT     | [3,4,0]           |

  @s4
  Scenario: 3D generation is deterministic for the same seed
    Given a 3D BoardShape and seed="3d-determinism"
    When generate() is called twice with identical options
    Then both results have the same arrow ids, directions, and cell paths
