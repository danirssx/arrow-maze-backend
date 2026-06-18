const SENSITIVE_KEY_PATTERN = /password|token|secret|authorization|credential/i;

type PrimitiveLogValue = string | number | boolean | null;
type SanitizedLogValue = PrimitiveLogValue | SanitizedLogValue[] | { [key: string]: SanitizedLogValue };

export function sanitizeLogContext(context: Record<string, unknown>): Record<string, SanitizedLogValue> {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeValue(key, value)])
  );
}

function sanitizeValue(key: string, value: unknown): SanitizedLogValue {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }

  if (typeof value === "object") {
    return sanitizeLogContext(value as Record<string, unknown>);
  }

  return String(value);
}

function redactSensitiveText(value: string): string {
  return value.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
}

