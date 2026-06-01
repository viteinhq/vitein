/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';
import { decodeVapidKey } from '$lib/pwa/vapid';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `vitein-${version}`;
const OFFLINE_URL = '/offline';

// The offline fallback is inlined rather than shipped as a `static/` file.
// Cloudflare Pages 308-redirects every `*.html` asset to its extensionless
// form, and that target is then swallowed by SvelteKit's catch-all route
// (404). A fetched `offline.html` therefore never resolves — which would
// make `cache.addAll` reject and abort the whole service-worker install.
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Offline — vite.in</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1eee7;
        color: #0a0a0a;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 24px;
      }
      .box { max-width: 22rem; }
      h1 { font-size: 1.5rem; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
      p { color: #6b6863; line-height: 1.5; margin: 0; }
      .dot {
        display: inline-block;
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        background: #ff5436;
        vertical-align: middle;
      }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>You're offline <span class="dot"></span></h1>
      <p>vite.in needs a connection right now. Check your network and try again.</p>
    </div>
  </body>
</html>`;

// App shell: hashed build assets + everything in static/ (icons, manifest).
// Hashed assets are immutable, so a `version` bump is a clean cache swap.
const PRECACHE = [...build, ...files];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(PRECACHE);
      // The offline page is synthesised here — it has no URL on the origin.
      await cache.put(
        OFFLINE_URL,
        new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }),
      );
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept cross-origin requests (the API, Stripe, fonts).
  if (url.origin !== sw.location.origin) return;

  // Hashed build assets + static files are immutable — serve cache-first.
  if (build.includes(url.pathname) || files.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page navigations — network-first, fall back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// ─── Web Push ──────────────────────────────────────────────────────
interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

sw.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'vite.in', body: event.data.text() };
  }
  event.waitUntil(
    sw.registration.showNotification(payload.title ?? 'vite.in', {
      body: payload.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const target = data?.url ?? '/';
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (client.url.startsWith(sw.location.origin)) {
          await client.focus();
          await client.navigate(target);
          return;
        }
      }
      await sw.clients.openWindow(target);
    }),
  );
});

// Browsers periodically rotate or expire a push subscription on their own.
// Re-subscribe and hand the server the old + new endpoints so it can
// migrate the stored record without losing the owner binding. The old
// endpoint is the only credential available here — the SW holds no creator
// token — so the server keys the migration on it.
sw.addEventListener('pushsubscriptionchange', (event) => {
  const change = event as ExtendableEvent & { oldSubscription?: PushSubscription };
  change.waitUntil(resubscribe(change.oldSubscription));
});

async function resubscribe(oldSubscription: PushSubscription | undefined): Promise<void> {
  // The server re-points the stored row only if we prove possession of the
  // old subscription's `auth` secret, so without `oldSubscription` (and its
  // keys) there is nothing we can safely migrate.
  const old = oldSubscription?.toJSON();
  const oldEndpoint = old?.endpoint;
  const oldKeys = old?.keys;
  if (!oldEndpoint || !oldKeys) return;
  try {
    const keyRes = await fetch('/api/push');
    if (!keyRes.ok) return;
    const { key } = (await keyRes.json()) as { key: string };
    const subscription = await sw.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(key),
    });
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldEndpoint, oldKeys, subscription: subscription.toJSON() }),
    });
  } catch {
    // Best-effort — if this fails the user re-enables manually next visit.
  }
}
