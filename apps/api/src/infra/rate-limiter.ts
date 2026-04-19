/**
 * Fixed-window rate limiter, one Durable Object instance per key.
 *
 * State lives in memory on the DO. Cloudflare may evict a DO instance under
 * memory pressure or after extended idle, which resets the window — that
 * is acceptable for rate limiting (a brief overshoot during failover is
 * not a security issue here).
 *
 * Window: 60 seconds. Each request POSTs `{ limit }` to the DO; the DO
 * responds with `{ allowed, remaining, retryAfter }`.
 */
export class RateLimiter {
  private count = 0;
  private windowStartMs = 0;

  fetch(request: Request): Response {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') ?? '60');
    const windowMs = 60_000;
    const now = Date.now();

    if (now - this.windowStartMs >= windowMs) {
      this.windowStartMs = now;
      this.count = 0;
    }

    this.count += 1;
    const allowed = this.count <= limit;
    const remaining = Math.max(0, limit - this.count);
    const retryAfter = Math.ceil((this.windowStartMs + windowMs - now) / 1000);

    return Response.json({ allowed, remaining, retryAfter });
  }
}
