export class CompletedAt {
  constructor(readonly value: Date) {}

  static now(): CompletedAt {
    return new CompletedAt(new Date());
  }
}
