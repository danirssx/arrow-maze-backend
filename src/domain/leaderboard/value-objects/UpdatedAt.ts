export class UpdatedAt {
  constructor(readonly value: Date) {}

  static now(): UpdatedAt {
    return new UpdatedAt(new Date());
  }
}
