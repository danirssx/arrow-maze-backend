export class TimeSeconds {
  constructor(readonly value: number) {
    if (value <= 0) {
      throw new Error('TimeSeconds must be greater than zero');
    }
  }

  isFasterThan(other: TimeSeconds): boolean {
    return this.value < other.value;
  }
}
