Feature: Leaderboard best-score upsert — replays improve the best, never 422
  As a player who replays a level to improve my time
  We want the leaderboard to keep my best result and accept resubmissions
  So that improved scores are recorded and worse replays are an idempotent no-op

  @s1
  Scenario: Better resubmission replaces the stored entry
    Given a leaderboard already holds the user's entry with score 100 and time 60
    When the same user submits a better entry with score 200
    Then the user's entry is replaced with score 200
    And the leaderboard still holds exactly one entry for the user
    And a LeaderboardUpdatedEvent is recorded

  @s2
  Scenario: Worse resubmission keeps the stored best as a no-op
    Given a leaderboard already holds the user's entry with score 200 and time 30
    When the same user submits a worse entry with score 100
    Then the stored entry with score 200 is kept unchanged
    And no LeaderboardUpdatedEvent is recorded
    And no DuplicateEntryError is thrown

  @s3
  Scenario: Equal resubmission keeps the stored best as a no-op
    Given a leaderboard already holds the user's entry with score 100 and time 30
    When the same user submits an equal entry with score 100 and time 30
    Then the stored entry is kept unchanged
    And no LeaderboardUpdatedEvent is recorded

  @s4
  Scenario: Equal score with a faster time replaces the slower entry
    Given a leaderboard already holds the user's entry with score 100 and time 60
    When the same user submits score 100 with time 20
    Then the user's entry is replaced with time 20

  @s5
  Scenario: A new user is added and the board is ranked and truncated
    Given a leaderboard at max capacity 2 with two users
    When a new user submits a higher score
    Then the new user is ranked first
    And the leaderboard holds exactly 2 entries

  @s6
  Scenario: The aggregate never holds two entries for the same user
    Given a leaderboard that already holds the user's entry
    When the same user submits any new entry
    Then the leaderboard holds exactly one entry for that user

  @s7
  Scenario: SubmitScoreService accepts a better resubmission via the use case
    Given a stored leaderboard with the user's entry of score 100
    When the service executes a submission with score 200 for the same user
    Then the repository saves a leaderboard whose user entry has score 200

  @s8
  Scenario: SubmitScoreService accepts a worse resubmission without throwing
    Given a stored leaderboard with the user's entry of score 200
    When the service executes a submission with score 100 for the same user
    Then the service resolves without throwing
    And the repository saves a leaderboard whose user entry still has score 200

  @s9
  Scenario: The repository persists exactly one row per user after a replacement
    Given a leaderboard holding a single entry for the user after a replacement
    When the repository saves the leaderboard
    Then createMany is called with exactly one row for that user
    And the unique constraint on leaderboardId and userId is respected
