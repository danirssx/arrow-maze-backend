import { DeterministicDailyChallengeGenerator } from "../../../src/infrastructure/daily-challenge/DeterministicDailyChallengeGenerator.js";
import type { DailyChallengeGeneratorInput } from "../../../src/application/daily-challenge/ports/DailyChallengeGenerator.js";

// Subject to human review — fallback generator test for MAZ-218 @s4..@s7.

const INPUT: DailyChallengeGeneratorInput = {
  date: "2026-07-10",
  seed: "daily-2026-07-10",
  targetDifficulty: "MEDIUM",
  expiresAt: "2026-07-11T00:00:00.000Z",
};

describe("DeterministicDailyChallengeGenerator", () => {
  it("should_return_same_valid_candidate_when_seed_is_same", async () => {
    // Arrange
    const generator = new DeterministicDailyChallengeGenerator();

    // Act
    const first = await generator.generate(INPUT);
    const second = await generator.generate(INPUT);

    // Assert
    expect(first).toEqual(second);
    expect(first).toEqual(
      expect.objectContaining({
        date: "2026-07-10",
        seed: "daily-2026-07-10",
        targetDifficulty: "MEDIUM",
        level: expect.objectContaining({
          difficulty: "MEDIUM",
          definition: expect.objectContaining({
            attempts: expect.any(Number),
            arrows: expect.any(Array),
            boardShape: expect.objectContaining({ type: "CELL_MASK" }),
          }),
        }),
      })
    );
  });
});
