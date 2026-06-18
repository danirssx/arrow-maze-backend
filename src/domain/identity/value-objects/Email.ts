import { InvalidArgumentError } from "../../errors/DomainError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new InvalidArgumentError("Invalid email format");
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
