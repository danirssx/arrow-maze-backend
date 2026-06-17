export class MoveCount {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('MoveCount must be a positive integer');
    }
  }
}
