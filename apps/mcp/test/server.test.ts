import { describe, expect, it } from 'vitest';
import { dispatch, tools } from '../src/server.js';
import type { Env } from '../src/types.js';

const env: Env = {
  ENVIRONMENT: 'dev',
  API_BASE_URL: 'http://api.test',
};

describe('JSON-RPC dispatch', () => {
  it('initialize returns protocolVersion, serverInfo, capabilities', async () => {
    const res = await dispatch(env, { jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(res.id).toBe(1);
    expect(res.error).toBeUndefined();
    const result = res.result as {
      protocolVersion: string;
      serverInfo: { name: string };
      capabilities: { tools: unknown };
    };
    expect(result.serverInfo.name).toBe('vitein-mcp');
    expect(result.capabilities.tools).toBeDefined();
  });

  it('tools/list returns every registered tool', async () => {
    const res = await dispatch(env, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const result = res.result as { tools: Array<{ name: string }> };
    expect(result.tools.map((t) => t.name).sort()).toEqual([...tools].map((t) => t.name).sort());
  });

  it('tools/call with unknown tool returns JSON-RPC -32601', async () => {
    const res = await dispatch(env, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'nope', arguments: {} },
    });
    expect(res.error?.code).toBe(-32601);
  });

  it('unknown method returns JSON-RPC -32601', async () => {
    const res = await dispatch(env, {
      jsonrpc: '2.0',
      id: 4,
      method: 'mystery/method',
    });
    expect(res.error?.code).toBe(-32601);
  });
});
