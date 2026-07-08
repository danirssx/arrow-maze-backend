Feature: Full-catalog QA test user
  A documented, non-secret local/dev QA account exists in the seed so one stable user
  can test the complete level catalog with normal sequential progression.

  @s1
  Scenario: The seed defines the QA full-catalog account
    Given the demo credentials seed
    When it is loaded
    Then it contains the QA full-catalog account
    And the QA account password is a valid raw password

  @s2
  Scenario: The QA account uses a cost-12 hash like the app hasher
    Given the QA account documented password
    When it is hashed at the demo bcrypt cost
    Then the app hasher verifies it
    And the hash cost is 12

  @s3
  Scenario: The chosen QA policy is normal progression
    Given the seed-data QA progression policy
    When it is read
    Then it is "normal-progression"

  @s4
  Scenario: The QA account starts empty (no seeded progress)
    Given the demo progress and leaderboard seed data
    When it is inspected
    Then the QA account is not referenced in any seeded completion or leaderboard entry

  @s5
  Scenario: Seeded progress references only known demo users
    Given the demo progress and leaderboard seed data
    When the referenced user ids are collected
    Then every referenced user id belongs to a seeded demo credential
