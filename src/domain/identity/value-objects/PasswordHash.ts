export class PasswordHash {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static fromHash(hash: string): PasswordHash {
    return new PasswordHash(hash);
  }
}
