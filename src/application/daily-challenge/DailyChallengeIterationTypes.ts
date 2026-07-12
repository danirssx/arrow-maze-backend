import type { DailyChallengeDto, DailyChallengeSource } from "./DailyChallengeTypes.js";

export type DailyChallengeIterationStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export type DailyChallengeIterationEventType =
  | "REQUESTED"
  | "GENERATION_STARTED"
  | "GENERATOR_SELECTED"
  | "CANDIDATE_REJECTED"
  | "FALLBACK_USED"
  | "VALIDATION_PASSED"
  | "CACHE_REPLACED"
  | "FAILED";

/**
 * Sanitized operation-log event. It may carry stable metadata (the chosen
 * source and fallback usage) but must never carry Gemini keys, prompts, raw
 * provider payloads, stack traces, or provider exception details.
 */
export type DailyChallengeIterationEventDto = {
  readonly sequence: number;
  readonly type: DailyChallengeIterationEventType;
  readonly message: string;
  readonly source?: DailyChallengeSource;
  readonly fallbackUsed?: boolean;
  readonly createdAt: string;
};

export type DailyChallengeIterationDto = {
  readonly operationId: string;
  readonly date: string;
  readonly status: DailyChallengeIterationStatus;
  readonly requestedAt: string;
  readonly completedAt: string | null;
  readonly events: readonly DailyChallengeIterationEventDto[];
  readonly challenge: DailyChallengeDto | null;
};
