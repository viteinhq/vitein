/**
 * Domain errors. Routes throw these; `middleware/error.ts` maps them to
 * HTTP responses. Never throw raw `Error` from a handler — wrap it with a
 * stable `code` so clients can localise.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(code = 'not_found', message = 'Resource not found') {
    super(code, message, 404);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(code = 'unauthorized', message = 'Missing or invalid credentials') {
    super(code, message, 401);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('validation_error', message, 400, details);
  }
}

export class ConflictError extends DomainError {
  constructor(code = 'conflict', message = 'Conflicting state') {
    super(code, message, 409);
  }
}
