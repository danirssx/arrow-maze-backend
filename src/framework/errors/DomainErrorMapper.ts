import type { DomainError } from "../../domain/errors/DomainError.js";

const STATUS_MAP: Record<string, number> = {
  INVALID_ARGUMENT: 422,
  BUSINESS_RULE_VIOLATION: 422,
};

export class DomainErrorMapper {
  static toHttpStatus(error: DomainError): number {
    return STATUS_MAP[error.code] ?? 422;
  }
}
