/**
 * True when a thrown database error is a Postgres unique-constraint
 * violation (SQLSTATE 23505).
 *
 * Walks the `cause` chain: the Drizzle driver wraps the underlying driver
 * error, so the 23505 code and "duplicate key" message live on `err.cause`,
 * not on the thrown wrapper. Matches the code (string or numeric) and the
 * message so it holds across driver/version differences.
 */
export function isUniqueViolation(err: unknown): boolean {
  for (
    let e: unknown = err;
    e != null && typeof e === 'object';
    e = (e as { cause?: unknown }).cause
  ) {
    const code = (e as { code?: unknown }).code;
    if (code === '23505' || code === 23505) return true;
    const message = (e as { message?: unknown }).message;
    if (typeof message === 'string' && /duplicate key|unique constraint/i.test(message)) {
      return true;
    }
  }
  return false;
}
