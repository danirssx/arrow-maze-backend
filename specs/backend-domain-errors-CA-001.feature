Feature: Domain errors are pure — no HTTP semantics in the domain layer
  As the backend team
  We want domain value objects to throw typed domain errors without HTTP knowledge
  So that the domain layer is independent of the HTTP transport and errors are handled correctly

  @s1
  Scenario: Score rejects negative value
    Given Score value is -1
    When Score is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT
    And the error has no httpStatus property

  @s2
  Scenario: Score rejects decimal value
    Given Score value is 1.5
    When Score is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s3
  Scenario: MoveCount rejects zero
    Given MoveCount value is 0
    When MoveCount is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s4
  Scenario: TimeSeconds rejects zero or negative
    Given TimeSeconds value is 0
    When TimeSeconds is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s5
  Scenario: Rank rejects zero
    Given Rank value is 0
    When Rank is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s6
  Scenario: UsernameSnapshot rejects empty string
    Given UsernameSnapshot value is empty string
    When UsernameSnapshot is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s7
  Scenario: MaxLeaderboardEntries rejects zero
    Given MaxLeaderboardEntries value is 0
    When MaxLeaderboardEntries is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s8
  Scenario: LevelScore rejects negative score
    Given LevelScore score is -1 timeSeconds is 10 movesCount is 5
    When LevelScore is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s9
  Scenario: ProgressVersion rejects negative value
    Given ProgressVersion value is -1
    When ProgressVersion is constructed
    Then InvalidArgumentError is thrown with code INVALID_ARGUMENT

  @s10
  Scenario: DomainError arriving at Express returns 422 with standard body
    Given an InvalidArgumentError with message "Score must be a non-negative integer" is thrown
    When the error passes through the error middleware
    Then the response status is 422
    And the response body has success false
    And the response body has code INVALID_ARGUMENT
    And the response body has the original message

  @s11
  Scenario: domain layer has no reference to AppError or httpStatus
    Given the src/domain directory
    When all TypeScript files are inspected for imports of AppError or the string httpStatus
    Then no such reference exists

  @s12
  Scenario: SubmitScoreService delegates score validation to the VO
    Given SubmitScoreService receives score -1 timeSeconds 10 movesCount 5
    When execute is called
    Then the service throws an error with code INVALID_ARGUMENT
    And the pre-validation guard in SubmitScoreService is removed
