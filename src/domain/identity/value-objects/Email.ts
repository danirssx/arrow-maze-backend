import { DomainError } from "../../errors/DomainError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!normalized || !EMAIL_REGEX.test(normalized)) {
      throw new DomainError("Invalid email format", "INVALID_EMAIL");
    }
    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
