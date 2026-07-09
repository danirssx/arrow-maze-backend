import { InvalidArgumentError } from "../../errors/DomainError.js";
import type { ArrowSpec } from "./ArrowSpec.js";

export const DEFAULT_ATTEMPTS = 5;

export class LevelDefinition {
  private constructor(
    private readonly _arrows: readonly ArrowSpec[],
    private readonly _attempts: number
  ) {}

  static create(arrows: ArrowSpec[], attempts = DEFAULT_ATTEMPTS): LevelDefinition {
    if (arrows.length === 0) {
      throw new InvalidArgumentError("Level definition must contain at least one arrow");
    }
    if (!Number.isInteger(attempts) || attempts < 1) {
      throw new InvalidArgumentError("Level attempts must be a positive integer");
    }

    const ids = new Set<string>();
    for (const arrow of arrows) {
      if (ids.has(arrow.id)) {
        throw new InvalidArgumentError(`Duplicate arrow id: ${arrow.id}`);
      }
      ids.add(arrow.id);
    }

    return new LevelDefinition([...arrows], attempts);
  }

  get arrows(): readonly ArrowSpec[] {
    return this._arrows;
  }

  get attempts(): number {
    return this._attempts;
  }
}
