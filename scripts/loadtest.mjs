#!/usr/bin/env node
/**
 * Minimal RPS load generator. No external deps.
 *
 * Usage:
 *   node scripts/loadtest.mjs <url> [--rps 100] [--duration 30]
 *
 * Reports count, errors, and p50/p95/p99 latencies. Targets from
 * PROJECT_PLAN §A.7:  p95 < 150ms on reads, < 400ms on writes at 100 RPS.
 */

const args = process.argv.slice(2);
const url = args[0];
if (!url) {
  console.error('usage: node scripts/loadtest.mjs <url> [--rps 100] [--duration 30]');
  process.exit(2);
}

const rps = readFlag('--rps', 100);
const durationSec = readFlag('--duration', 30);
const totalRequests = rps * durationSec;
const intervalMs = 1000 / rps;

console.log(
  `→ ${url}  |  ${String(rps)} rps × ${String(durationSec)}s = ${String(totalRequests)} requests\n`,
);

const latencies = [];
let errors = 0;
let statusCounts = new Map();

const start = Date.now();

await new Promise((resolve) => {
  let fired = 0;
  const timer = setInterval(() => {
    if (fired >= totalRequests) {
      clearInterval(timer);
      return;
    }
    fired += 1;
    fire();
  }, intervalMs);

  // Completion check — allow up to 10s for in-flight requests to drain.
  const checkDone = () => {
    if (fired >= totalRequests && latencies.length + errors >= totalRequests) {
      resolve(undefined);
      return;
    }
    const draining = Date.now() - start > durationSec * 1000 + 10_000;
    if (draining) {
      resolve(undefined);
      return;
    }
    setTimeout(checkDone, 100);
  };
  setTimeout(checkDone, 100);

  async function fire() {
    const t0 = performance.now();
    try {
      const res = await fetch(url, { method: 'GET' });
      const latency = performance.now() - t0;
      latencies.push(latency);
      statusCounts.set(res.status, (statusCounts.get(res.status) ?? 0) + 1);
      // drain body so sockets close cleanly
      await res.arrayBuffer();
    } catch {
      errors += 1;
    }
  }
});

const elapsed = (Date.now() - start) / 1000;
latencies.sort((a, b) => a - b);

const pct = (p) => {
  if (latencies.length === 0) return NaN;
  const idx = Math.floor((latencies.length - 1) * p);
  return latencies[idx];
};

console.log(`\nElapsed:  ${elapsed.toFixed(1)}s`);
console.log(`Requests: ${latencies.length} ok, ${errors} network errors`);
for (const [code, count] of [...statusCounts.entries()].sort()) {
  console.log(`  HTTP ${code}: ${count}`);
}
console.log(`\nLatency (ms):`);
console.log(`  p50 = ${pct(0.5).toFixed(1)}`);
console.log(`  p95 = ${pct(0.95).toFixed(1)}`);
console.log(`  p99 = ${pct(0.99).toFixed(1)}`);
console.log(`  max = ${Math.max(...latencies).toFixed(1)}`);

function readFlag(name, fallback) {
  const i = args.indexOf(name);
  if (i < 0) return fallback;
  return Number(args[i + 1] ?? fallback);
}
