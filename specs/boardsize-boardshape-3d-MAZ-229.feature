Feature: BoardSize depth dimension and BoardShape 3D cell support (MAZ-229)

  # BoardSize

  @s1
  Scenario: Create 3D BoardSize and read all accessors
    Given rows=3, cols=4, depth=2
    When BoardSize.create(3, 4, 2) is called
    Then rows accessor returns 3
    And cols accessor returns 4
    And depth accessor returns 2

  @s2
  Scenario: toCells enumerates all z-planes in z-outer row-middle col-inner order
    Given BoardSize.create(2, 2, 2)
    When toCells is called
    Then the result contains 8 cells in order:
      | z | row | col |
      | 0 |  0  |  0  |
      | 0 |  0  |  1  |
      | 0 |  1  |  0  |
      | 0 |  1  |  1  |
      | 1 |  0  |  0  |
      | 1 |  0  |  1  |
      | 1 |  1  |  0  |
      | 1 |  1  |  1  |

  @s3
  Scenario Outline: Reject invalid depth values
    When BoardSize.create(3, 3, <depth>) is called
    Then InvalidArgumentError with "positive integers" is thrown

    Examples:
      | depth |
      |   0   |
      |  -1   |
      | 1.5   |

  @s4
  Scenario: Reject depth exceeding BOARD_SIZE_MAX_DEPTH
    Given depth = BOARD_SIZE_MAX_DEPTH + 1
    When BoardSize.create(3, 3, depth) is called
    Then InvalidArgumentError with "must not exceed" is thrown

  @s5
  Scenario: Backward compat - create without depth defaults to 1 and toCells returns z=0 cells
    Given BoardSize.create(2, 2) with no depth argument
    When depth accessor is read and toCells is called
    Then depth returns 1
    And all cells have z equal to 0

  # BoardShape

  @s6
  Scenario: contains returns false for same row/col but different z
    Given a BoardShape with only Position(0, 0, 0)
    When contains(Position(0, 0, 1)) is called
    Then the result is false

  @s7
  Scenario: contains returns true for a 3D position present in the shape
    Given a BoardShape with Position(0, 0, 1)
    When contains(Position(0, 0, 1)) is called
    Then the result is true

  @s8
  Scenario: Position(0,0,0) and Position(0,0,1) are distinct cells in BoardShape
    Given cells [Position(0,0,0), Position(0,0,1)]
    When BoardShape.cellMask is called
    Then no error is thrown and shape.size equals 2

  @s9
  Scenario: Reject exact 3D duplicate in BoardShape
    Given cells [Position(0,0,1), Position(0,0,1)]
    When BoardShape.cellMask is called
    Then InvalidArgumentError with "Duplicate" is thrown
