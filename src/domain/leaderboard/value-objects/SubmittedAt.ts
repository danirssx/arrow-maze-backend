export class SubmittedAt {
  constructor(readonly value: Date) {}

  static now(): SubmittedAt {
    return new SubmittedAt(new Date());
  }
}
