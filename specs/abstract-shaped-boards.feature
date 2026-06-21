# Executable contract — Abstract Shaped Boards (Backend)
# Option A: boardShape is a visual + authoring/placement mask, NOT a physical wall.
# Extraction physics (unbounded raycast) are unchanged. AI/image upload = deferred (Phase 2).
# Human gate: approve these @s scenarios before any production code is written.

Feature: Abstract shaped Arrow Untangle level boards (backend contract, persistence, seed, generation)

  Background:
    Given the level catalog stores arrows as JSONB and validates ArrowSpec + DAG solvability
    And boardShape is an optional CELL_MASK of finite lattice cells

  # ---------- Slice 1: contract + persistence (S4, S3, S9, S2b) ----------

  @s4
  Scenario: Persist a shaped level and return it through the API
    Given an admin create-level request with arrows and a valid boardShape CELL_MASK
    And every arrow cell lies inside the mask
    When the backend saves the level
    Then the level row stores board_shape as JSONB
    And GET /levels/:levelId returns definition.arrows plus boardShape.cells unchanged

  @s2b
  Scenario: Backward compatibility for levels without a shape
    Given an existing level row whose board_shape column is null
    When GET /levels/:levelId is requested
    Then the response omits boardShape
    And the arrows and attempts are returned exactly as today

  @s3a
  Scenario: Reject duplicate shape cells
    Given a create-level request whose boardShape.cells contains two identical cells
    When the backend validates it
    Then it returns a controlled validation error
    And no level is persisted

  @s3b
  Scenario: Reject an arrow cell outside the mask
    Given a create-level request whose boardShape mask omits a cell occupied by an arrow path
    When the backend validates it
    Then it returns a controlled validation error
    And no level is persisted

  @s3c
  Scenario: Reject an unsupported shape type
    Given a create-level request whose boardShape.type is not "CELL_MASK"
    When the backend validates it
    Then it returns a controlled validation error

  @s3d
  Scenario: Reject an oversize shape
    Given a create-level request whose boardShape has more than 600 cells
    When the backend validates it
    Then it returns a controlled validation error

  @s3e
  Scenario: Reject a present-but-empty shape
    Given a create-level request whose boardShape is present but cells is empty
    When the backend validates it
    Then it returns a controlled validation error

  @s9
  Scenario: OpenAPI documents the optional board shape
    Given the exported OpenAPI specification
    Then CreateLevelRequest includes an optional boardShape with type "CELL_MASK" and a cells array
    And LevelDetail includes the same optional boardShape schema

  # ---------- Slice 2: authored abstract seed levels (S4 end-to-end) ----------

  @s10
  Scenario: Seed an authored abstract shaped level
    Given an authored shaped level JSON file under prisma/seed-data/level-json/
    When the seed script runs
    Then the level is validated through the domain reconstitution path
    And it is upserted with its boardShape
    And GET /levels lists it among published levels

  # ---------- Slice 3: deterministic RandomLevelStrategy (S7) ----------

  @s7
  Scenario: A generated level passes the same validation as authored JSON
    Given RandomLevelOptions with a fixed seed, difficulty, a boardShape mask, arrowCount, maxArrowLength and attempts
    When RandomLevelStrategy generates a candidate level
    Then every generated arrow lies inside the mask
    And the candidate passes ArrowSpec, boardShape containment and LevelSolvabilityPolicy (DAG) validation
    And generating again with the same seed produces an identical level

  @s7b
  Scenario: Bounded generation failure instead of an invalid level
    Given RandomLevelOptions that cannot be satisfied within the retry budget
    When RandomLevelStrategy runs
    Then it returns a controlled generation failure
    And it never returns an invalid or unsolvable level

  # ---------- Deferred to Phase 2 (separate ticket, NOT implemented here) ----------

  @s8 @deferred
  Scenario: Keep AI-generated candidates behind deterministic validation
    Given a Gemini-generated JSON candidate (Phase 2)
    When the candidate is submitted for use
    Then the backend must validate it through the same domain rules before saving or publishing
