import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

interface Spec {
  components?: Record<string, Record<string, unknown>>;
  paths?: Record<string, Record<string, unknown>>;
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

let cached: Promise<{ spec: Spec; ajv: Ajv2020 }> | null = null;

function loadOnce(): Promise<{ spec: Spec; ajv: Ajv2020 }> {
  if (cached) return cached;
  cached = (async () => {
    const specPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../packages/openapi-spec/vitein.yaml',
    );
    const raw = await readFile(specPath, 'utf-8');
    const spec = YAML.parse(raw) as Spec;

    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);

    return { spec, ajv };
  })();
  return cached;
}

export async function assertResponseMatchesSpec(
  operationId: string,
  status: number,
  body: unknown,
): Promise<void> {
  const { spec, ajv } = await loadOnce();
  const operation = findOperation(spec, operationId);
  if (!operation) {
    throw new Error(`No operation with operationId=${operationId} in spec`);
  }

  const responses = (operation as { responses?: Record<string, unknown> }).responses ?? {};
  const rawResponse =
    (responses[String(status)] as ResponseObject | undefined) ??
    (responses['default'] as ResponseObject | undefined);
  if (!rawResponse) {
    throw new Error(`No response declared for ${operationId} status ${String(status)}`);
  }

  const response = deref(rawResponse, spec) as ResponseObject;
  const schema = response.content?.['application/json']?.schema;
  if (!schema) {
    throw new Error(`No application/json schema for ${operationId} ${String(status)}`);
  }

  const validate = ajv.compile(schema);
  if (!validate(body)) {
    throw new Error(
      `Response does not match spec for ${operationId} ${String(status)}:\n` +
        JSON.stringify(validate.errors, null, 2),
    );
  }
}

interface ResponseObject {
  content?: {
    'application/json'?: {
      schema?: unknown;
    };
  };
}

function findOperation(spec: Spec, operationId: string): unknown {
  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of METHODS) {
      const op = pathItem[method];
      if (
        op &&
        typeof op === 'object' &&
        (op as { operationId?: string }).operationId === operationId
      ) {
        return op;
      }
    }
  }
  return null;
}

function deref(node: unknown, doc: Spec, seen = new Set<string>()): unknown {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => deref(n, doc, seen));

  if ('$ref' in node && typeof (node as { $ref: unknown }).$ref === 'string') {
    const ref = (node as { $ref: string }).$ref;
    if (!ref.startsWith('#/')) return node;
    if (seen.has(ref)) return {};
    seen.add(ref);
    const resolved = resolvePointer(doc, ref);
    return deref(resolved, doc, seen);
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    out[k] = deref(v, doc, seen);
  }
  return out;
}

function resolvePointer(doc: Spec, ref: string): unknown {
  const parts = ref.replace(/^#\//, '').split('/');
  let node: unknown = doc;
  for (const part of parts) {
    if (node && typeof node === 'object') {
      node = (node as Record<string, unknown>)[decodeURIComponent(part)];
    } else {
      return undefined;
    }
  }
  return node;
}
