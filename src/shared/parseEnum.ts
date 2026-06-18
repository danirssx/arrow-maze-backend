import { ValidationError } from './errors/ApplicationError.js';
import { InfrastructureError } from './errors/InfrastructureError.js';

export function parseEnumFromInput<T extends string>(
  enumObj: Record<string, T>,
  value: string,
  label: string,
): T {
  const values = Object.values(enumObj);
  if (!values.includes(value as T)) {
    throw new ValidationError(`Invalid ${label}: '${value}'. Valid values: ${values.join(', ')}`);
  }
  return value as T;
}

export function parseEnumFromDb<T extends string>(
  enumObj: Record<string, T>,
  value: string,
  label: string,
): T {
  const values = Object.values(enumObj);
  if (!values.includes(value as T)) {
    throw new InfrastructureError(`Corrupted DB value for ${label}: '${value}'. Valid values: ${values.join(', ')}`);
  }
  return value as T;
}
