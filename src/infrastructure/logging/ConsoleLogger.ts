import type { Logger } from "../../application/ports/Logger.js";

export class ConsoleLogger implements Logger {
  error(message: string, context?: Record<string, unknown>): void {
    console.error(message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, context);
  }

  info(_message: string, _context?: Record<string, unknown>): void {
    // Intentionally silent until a production logging policy is approved.
  }
}
