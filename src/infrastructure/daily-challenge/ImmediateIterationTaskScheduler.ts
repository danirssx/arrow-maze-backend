// Pattern: Adapter
import type { IterationTaskScheduler } from "../../application/daily-challenge/ports/IterationTaskScheduler.js";

/**
 * Default scheduler adapter. It defers the generation pipeline to the next
 * event-loop turn (`setImmediate`) so the admin start request can return the
 * RUNNING snapshot before generation runs. The task is fire-and-forget: the use
 * case persists the operation's terminal status itself, so a rejected task is
 * swallowed here to avoid an unhandled rejection crashing the process.
 */
export class ImmediateIterationTaskScheduler implements IterationTaskScheduler {
  schedule(task: () => Promise<void>): void {
    setImmediate(() => {
      void task().catch(() => {
        /* terminal status is persisted inside the task; nothing to surface here */
      });
    });
  }
}
