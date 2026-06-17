export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "DomainError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
