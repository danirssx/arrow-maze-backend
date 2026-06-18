export class Rank {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Rank must be a positive integer starting at 1');
    }
  }
}
