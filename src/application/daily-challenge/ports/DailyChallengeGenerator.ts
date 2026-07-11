export type DailyChallengeGeneratorInput = {
  readonly date: string;
  readonly seed: string;
  readonly targetDifficulty: string;
  readonly expiresAt: string;
};

export interface DailyChallengeGenerator {
  generate(input: DailyChallengeGeneratorInput): Promise<unknown>;
}
