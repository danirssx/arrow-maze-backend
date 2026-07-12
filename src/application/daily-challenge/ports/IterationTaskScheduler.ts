/**
 * Application port that decouples the manual iteration command from the timing
 * of the generation pipeline. `StartDailyChallengeIterationUseCase` persists the
 * RUNNING operation and hands the generation work to the scheduler so the HTTP
 * response returns the RUNNING snapshot while the admin dashboard polls for the
 * terminal result.
 *
 * Infrastructure provides the concrete timing (deferred microtask/immediate);
 * tests provide a synchronous or manual scheduler for deterministic assertions.
 */
export interface IterationTaskScheduler {
  schedule(task: () => Promise<void>): void;
}
