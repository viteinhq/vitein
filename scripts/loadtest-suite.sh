#!/usr/bin/env bash
# Phase-1-exit load-test suite. Runs the canonical read + write scenarios
# against the given base URL and prints latency histograms.
#
# Targets (PROJECT_PLAN §A.7):
#   reads:  100 RPS sustained, p95 < 150ms
#   writes: 100 RPS sustained, p95 < 400ms
#
# Usage:
#   scripts/loadtest-suite.sh https://api-staging.vite.in
#
# Prereq: a known event exists. Pass its UUID in EVENT_ID, or the script
# resolves the seed event by slug `loadtest` if EVENT_SLUG is set.

set -euo pipefail

BASE="${1:-}"
if [[ -z "${BASE}" ]]; then
  echo "usage: $0 <base-url>"
  exit 2
fi

DUR="${DUR:-30}"
RPS_READ="${RPS_READ:-100}"
RPS_WRITE="${RPS_WRITE:-100}"

here="$(cd "$(dirname "$0")" && pwd)"

echo "=== /v1/health  (read, ${RPS_READ} rps × ${DUR}s) ==="
node "${here}/loadtest.mjs" "${BASE}/v1/health" --rps "${RPS_READ}" --duration "${DUR}"

if [[ -n "${EVENT_SLUG:-}" ]]; then
  echo
  echo "=== /v1/events/by-slug/${EVENT_SLUG}  (read, ${RPS_READ} rps × ${DUR}s) ==="
  node "${here}/loadtest.mjs" "${BASE}/v1/events/by-slug/${EVENT_SLUG}" \
    --rps "${RPS_READ}" --duration "${DUR}"
fi

if [[ -n "${EVENT_ID:-}" ]]; then
  echo
  echo "=== POST /v1/events/${EVENT_ID}/rsvps  (write, ${RPS_WRITE} rps × ${DUR}s) ==="
  node "${here}/loadtest.mjs" "${BASE}/v1/events/${EVENT_ID}/rsvps" \
    --rps "${RPS_WRITE}" --duration "${DUR}" \
    --method POST \
    --body '{"name":"Loadtester","status":"yes"}'
fi

echo
echo "=== POST /v1/events  (write, ${RPS_WRITE} rps × ${DUR}s) ==="
node "${here}/loadtest.mjs" "${BASE}/v1/events" \
  --rps "${RPS_WRITE}" --duration "${DUR}" \
  --method POST \
  --body '{"title":"Load test","startsAt":"2026-12-31T18:00:00Z","timezone":"UTC","creatorEmail":"loadtest@example.com"}'
