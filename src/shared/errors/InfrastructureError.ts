import { AppError, type ErrorDetails } from './AppError.js';

export class InfrastructureError extends AppError {
  constructor(message = 'Internal infrastructure error', details?: ErrorDetails) {
    super('INFRASTRUCTURE_ERROR', 500, message, details);
  }
}
