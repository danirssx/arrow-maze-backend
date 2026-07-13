Feature: 6 directions and 3D ArrowSpec deltas (MAZ-227)

  @s1
  Scenario: ArrowSpec accepts a path that moves along the z-axis with FORWARD
    Given a path [(0,0,0), (0,0,1)] with direction FORWARD
    When ArrowSpec.create is called
    Then it succeeds and head equals (0,0,1)

  @s2
  Scenario: z-adjacent cells are considered orthogonally adjacent
    Given a path [(0,0,0), (0,0,1), (0,0,2)] with direction FORWARD
    When ArrowSpec.create is called
    Then it succeeds with path length 3

  @s3
  Scenario: Diagonal move in 3D is rejected as not orthogonally connected
    Given a path [(0,0,0), (1,0,1)] with direction FORWARD
    When ArrowSpec.create is called
    Then it throws "orthogonally connected"

  @s4
  Scenario: ArrowSpec throws when head points back along z-axis
    Given a path [(0,0,0), (0,0,1)] with direction BACK
    When ArrowSpec.create is called
    Then it throws "points back"

  @s5
  Scenario: Existing 2D arrows are unaffected by the new directions
    Given any valid 2D path with direction UP, DOWN, LEFT, or RIGHT
    When ArrowSpec.create is called
    Then it succeeds without modification
