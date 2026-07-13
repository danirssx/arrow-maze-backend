Feature: LevelSolvabilityPolicy 3D raycast (MAZ-228)

  @s1
  Scenario: UP and DOWN arrows on the same z-plane form a cycle
    Given arrow A at (2,1,1) pointing UP and arrow B at (0,1,1) pointing DOWN
    When isSolvable is evaluated
    Then the result is false (cycle on same z-plane)

  @s2
  Scenario: UP arrow not blocked by DOWN arrow on a different z-plane
    Given arrow A at (2,1,1) pointing UP and arrow B at (0,1,0) pointing DOWN
    When isSolvable is evaluated
    Then the result is true (different z-planes do not interact)

  @s3
  Scenario: RIGHT arrow not blocked by LEFT arrow on a different z-plane
    Given arrow A at (0,0,2) pointing RIGHT and arrow B at (0,1,0) pointing LEFT
    When isSolvable is evaluated
    Then the result is true (different z-planes do not interact)

  @s4
  Scenario: 2D level (all z=0) cycle detection is unaffected
    Given arrow A at (0,0,0) pointing RIGHT and arrow B at (0,2,0) pointing LEFT
    When isSolvable is evaluated
    Then the result is false (2D cycle still detected)

  @s5
  Scenario: Planar cycle on a non-zero z-plane is detected
    Given arrow A at (0,0,3) pointing RIGHT and arrow B at (0,2,3) pointing LEFT
    When isSolvable is evaluated
    Then the result is false (cycle on z=3 plane)
