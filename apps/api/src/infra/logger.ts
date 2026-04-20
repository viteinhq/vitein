/**
 * Structured logger for the Core API.
 *
 * Emits one JSON line per log call to stdout. Cloudflare Logpush ships
 * stdout into R2 and Sentry picks up `error`-level calls via its breadcrumb
 * mechanism. Shape:
 *
 *   { ts, level, msg, requestId?, env?, ...ctx }
 *
 * Use the `with(ctx)` builder to attach a requestId or any other context
 * that should flow through downstream log calls without re-stating it at
 * every site.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  env?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
  with: (ctx: LogContext) => Logger;
}

export function createLogger(base: LogContext = {}): Logger {
  const emit = (level: LogLevel, msg: string, ctx?: LogContext): void => {
    const line = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...base,
      ...(ctx ?? {}),
    };
    const payload = JSON.stringify(line, replaceErrors);
    if (level === 'error') console.error(payload);
    else console.warn(payload);
  };

  return {
    debug: (msg, ctx) => emit('debug', msg, ctx),
    info: (msg, ctx) => emit('info', msg, ctx),
    warn: (msg, ctx) => emit('warn', msg, ctx),
    error: (msg, ctx) => emit('error', msg, ctx),
    with: (ctx) => createLogger({ ...base, ...ctx }),
  };
}

/** Turn Error instances into serialisable shapes. */
function replaceErrors(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

/** Top-level logger used when no per-request logger is available (e.g. cron startup). */
export const rootLogger = createLogger();
