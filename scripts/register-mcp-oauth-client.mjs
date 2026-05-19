#!/usr/bin/env node
/**
 * Register the first-party MCP server as an OAuth client.
 *
 * Run once per environment, after the OAuth Provider migration has been
 * applied. The plugin's `createOAuthClient` admin endpoint inserts the
 * row; we capture the returned `client_id` + `client_secret` and store
 * them as Wrangler secrets on the MCP worker.
 *
 * Usage:
 *   API_BASE_URL=https://api-staging.vite.in \
 *   ADMIN_SESSION_COOKIE='better-auth.session_token=…' \
 *   node scripts/register-mcp-oauth-client.mjs
 *
 * The admin session cookie comes from signing in to the staging dashboard
 * as Kim. The OAuth-provider plugin's create-client endpoint requires an
 * authenticated user — that user becomes the `userId` on the client row.
 *
 * Why a script and not a migration: client_secret is shown exactly once,
 * so the act of registering has to be interactive enough to capture the
 * output. A migration that hard-codes the secret would defeat the point.
 */

const baseUrl = process.env.API_BASE_URL;
const cookie = process.env.ADMIN_SESSION_COOKIE;

if (!baseUrl) {
  console.error('Missing API_BASE_URL.');
  process.exit(2);
}
if (!cookie) {
  console.error(
    'Missing ADMIN_SESSION_COOKIE. Sign in to the dashboard, copy the ' +
      '`better-auth.session_token` cookie from devtools, and pass it here.',
  );
  process.exit(2);
}

const redirectUris = process.env.MCP_REDIRECT_URIS?.split(',').map((s) => s.trim()) ?? [
  // The MCP server hosts its OAuth callback on the same origin; clients
  // start at /mcp/oauth/start and finish at /mcp/oauth/callback.
  `${baseUrl.replace('api', 'mcp')}/oauth/callback`,
  // For local development against Claude Desktop and the MCP Inspector.
  'http://localhost:8788/oauth/callback',
];

const body = {
  name: 'vite.in MCP Server',
  redirect_uris: redirectUris,
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'events:read',
    'events:write',
    'guests:read',
    'guests:write',
    'rsvps:read',
    'rsvps:write',
  ],
  // PKCE remains required by the plugin regardless of `public`.
  // `skip_consent` is intentionally NOT sent — the OAuth Provider plugin
  // rejects it at Dynamic Client Registration time (RFC 7591 doesn't list
  // it as a registration parameter). Flip the flag post-registration via
  // a direct DB update once we have an admin endpoint.
  public: false,
};

console.log(`→ POST ${baseUrl}/v1/auth/oauth2/register`);
console.log('  redirect_uris:', redirectUris);

// Better-Auth's session-cookie check rejects POSTs without an Origin
// header that matches a trusted origin (CSRF defense). The API base
// itself is always trusted (it's the auth.baseURL), so set it here.
const res = await fetch(`${baseUrl}/v1/auth/oauth2/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: cookie,
    Origin: baseUrl,
  },
  body: JSON.stringify(body),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Registration failed: HTTP ${String(res.status)}`);
  console.error(text);
  process.exit(1);
}

const result = await res.json();
console.log('\n✅ Registered. Capture these into wrangler secrets:\n');
console.log(`MCP_OAUTH_CLIENT_ID=${result.client_id}`);
if (result.client_secret) {
  console.log(`MCP_OAUTH_CLIENT_SECRET=${result.client_secret}`);
}
console.log('\nThen:');
console.log(`  pnpm -F @vitein/mcp exec wrangler secret put MCP_OAUTH_CLIENT_ID --env staging`);
console.log(`  pnpm -F @vitein/mcp exec wrangler secret put MCP_OAUTH_CLIENT_SECRET --env staging`);
console.log('\nThe client_secret is shown once — store it now.');
