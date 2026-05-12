import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import YAML from 'yaml';
import { app } from '../src/index.js';
import type { Env } from '../src/types/env.js';

interface SpecOp {
  method: string;
  specPath: string;
  operationId: string;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

async function loadSpecOps(): Promise<SpecOp[]> {
  const specPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../packages/openapi-spec/vitein.yaml',
  );
  const raw = await readFile(specPath, 'utf-8');
  const spec = YAML.parse(raw) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };

  const ops: SpecOp[] = [];
  for (const [p, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = methods[method];
      if (op?.operationId) {
        ops.push({ method: method.toUpperCase(), specPath: p, operationId: op.operationId });
      }
    }
  }
  return ops;
}

function specPathToUrl(specPath: string): string {
  return specPath.replace(/\{[^}]+\}/g, '00000000-0000-0000-0000-000000000001');
}

const emptyEnv = {} as Env;

describe('OpenAPI spec coverage', () => {
  // The coverage test deliberately hits routes without DATABASE_URL, so the
  // global error handler will log `unhandled_error` for each DB-backed
  // endpoint. That noise is expected here — silence it for this suite only.
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('every operationId in the spec is reachable in the app', async () => {
    const ops = await loadSpecOps();
    const missing: string[] = [];

    for (const op of ops) {
      const url = `http://localhost${specPathToUrl(op.specPath)}`;
      const res = await app.fetch(new Request(url, { method: op.method }), emptyEnv);

      if (res.status === 404) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { code?: string };
        };
        if (body.error?.code === 'not_found') {
          missing.push(`${op.method} ${op.specPath} (${op.operationId})`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
