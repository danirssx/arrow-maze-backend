export type DailyChallengeSource = "gemini" | "fallback";

export type DailyChallengeLevelDto = {
  readonly name: string;
  readonly description: string;
  readonly difficulty: string;
  readonly definition: {
    readonly attempts: number;
    readonly arrows: {
      readonly id: string;
      readonly color: string;
      readonly path: { readonly row: number; readonly col: number }[];
      readonly direction: string;
    }[];
    readonly boardShape?: {
      readonly type: string;
      readonly cells: { readonly row: number; readonly col: number }[];
    };
  };
  readonly timeLimitSeconds?: number;
};

export type DailyChallengeDto = {
  readonly date: string;
  readonly seed: string;
  readonly targetDifficulty: string;
  readonly source: DailyChallengeSource;
  readonly generatedAt: string;
  readonly expiresAt: string;
  readonly validation: {
    readonly solvable: true;
    readonly difficultyMatched: true;
    readonly fallbackUsed: boolean;
  };
  readonly level: DailyChallengeLevelDto;
};
