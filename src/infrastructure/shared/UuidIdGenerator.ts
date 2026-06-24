import { randomUUID } from 'crypto';
import type { IdGenerator } from '../../application/ports/IdGenerator.js';

export class UuidIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
