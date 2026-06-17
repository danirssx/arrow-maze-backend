import { InvalidArgumentError } from "../../errors/DomainError.js";
import type { CellType } from "../enums/CellType.js";
import { CellType as CellTypeEnum } from "../enums/CellType.js";
import type { Direction } from "../enums/Direction.js";
import type { Position } from "./Position.js";

export class CellSpec {
  private constructor(
    private readonly _position: Position,
    private readonly _type: CellType,
    private readonly _direction: Direction | undefined
  ) {}

  static create(position: Position, type: CellType, direction?: Direction): CellSpec {
    const needsDirection =
      type === CellTypeEnum.ARROW || type === CellTypeEnum.START;

    if (needsDirection && direction === undefined) {
      throw new InvalidArgumentError(
        `A ${type} cell must have a direction`
      );
    }
    if (!needsDirection && direction !== undefined) {
      throw new InvalidArgumentError(
        `A ${type} cell must not have a direction`
      );
    }
    return new CellSpec(position, type, direction);
  }

  get position(): Position {
    return this._position;
  }

  get type(): CellType {
    return this._type;
  }

  get direction(): Direction | undefined {
    return this._direction;
  }
}
