/**
 * Minimal Sentry transport for the Pages runtime.
 *
 * The official Sentry SDKs bundle Node-only primitives that the Cloudflare
 * Workers runtime can't resolve at import time, and `@sentry/cloudflare`
 * only exposes `withSentry` — there's no public `init` + `captureException`
 * surface we can call from inside a SvelteKit hook.
 *
 * The ingest protocol itself is small: parse the DSN, POST a two-line
 * envelope to `<host>/api/<project>/envelope/` signed with `sentry_key`.
 * This function does exactly that and nothing else — stack normalisation,
 * breadcrumbs, tracing are deliberately skipped until we need them.
 */

interface ParsedDsn {
  host: string;
  projectId: string;
  publicKey: string;
}

export interface CaptureOptions {
  dsn: string;
  error: unknown;
  environment?: string;
  requestId?: string;
  release?: string;
}

export async function captureToSentry(opts: CaptureOptions): Promise<void> {
  const parsed = parseDsn(opts.dsn);
  if (!parsed) return;

  const err = normaliseError(opts.error);
  const eventId = randomEventId();
  const nowSeconds = Date.now() / 1000;

  const envelopeHeader = JSON.stringify({
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn: opts.dsn,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  const itemPayload = JSON.stringify({
    event_id: eventId,
    timestamp: nowSeconds,
    platform: 'javascript',
    level: 'error',
    logger: 'sveltekit-hooks',
    environment: opts.environment,
    release: opts.release,
    exception: {
      values: [
        {
          type: err.name,
          value: err.message,
          stacktrace: err.stack ? { frames: framesFromStack(err.stack) } : undefined,
        },
      ],
    },
    tags: opts.requestId ? { request_id: opts.requestId } : undefined,
  });

  const body = `${envelopeHeader}\n${itemHeader}\n${itemPayload}`;
  const url = `https://${parsed.host}/api/${parsed.projectId}/envelope/`;
  const auth = `Sentry sentry_version=7, sentry_client=vitein-web/0.0.0, sentry_key=${parsed.publicKey}`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': auth,
      },
      body,
    });
  } catch {
    // Swallow — never let Sentry reporting become its own incident.
  }
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '');
    if (!publicKey || !projectId) return null;
    return { host: u.host, projectId, publicKey };
  } catch {
    return null;
  }
}

function normaliseError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return { name: err.name || 'Error', message: err.message, stack: err.stack };
  }
  return { name: 'UnknownError', message: String(err) };
}

interface Frame {
  filename: string;
  function?: string;
  lineno?: number;
  colno?: number;
}

function framesFromStack(stack: string): Frame[] {
  const frames: Frame[] = [];
  for (const line of stack.split('\n').slice(1)) {
    const match = /at (?:(\S+) \()?(.+?):(\d+):(\d+)\)?$/.exec(line.trim());
    if (match) {
      frames.push({
        function: match[1],
        filename: match[2] ?? '<anonymous>',
        lineno: Number(match[3]),
        colno: Number(match[4]),
      });
    }
  }
  return frames.reverse();
}

function randomEventId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
