import { error as httpError, redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

/**
 * OAuth 2.1 consent screen — the user lands here mid-flow when an
 * OAuth client (e.g. the vite.in MCP Server) asks for scoped access
 * via `/v1/auth/oauth2/authorize`. Better-Auth's `oauth-provider`
 * plugin redirects here with a signed query string; we must echo it
 * back when POSTing the user's decision.
 *
 * Load fetches the public client metadata (name) and renders the
 * scopes the client requested. The form action POSTs to
 * `/v1/auth/oauth2/consent` with `oauth_query` (the full search
 * string) and `accept: true|false`. Better-Auth verifies the
 * signature, persists consent if accepted, and returns a
 * `redirect_uri` — we send the browser there.
 */

/**
 * Better-Auth's /oauth2/consent returns `{ redirect: true, url: '…' }`
 * — both the accept and deny paths flow through the same shape. We
 * also accept RFC-7591-style `redirect_uri` as a fallback for
 * forward-compat with a future plugin rename.
 */
interface ConsentResponse {
  redirect?: boolean;
  url?: string;
  redirect_uri?: string;
  error?: string;
  error_description?: string;
}

interface PublicClient {
  client_id?: string;
  client_name?: string;
}

export const load: PageServerLoad = async (event) => {
  const params = event.url.searchParams;
  const clientId = params.get('client_id');
  const scope = params.get('scope') ?? '';
  const sig = params.get('sig');

  if (!clientId || !sig) {
    return { invalid: true as const };
  }

  const oauthQuery = params.toString();
  const scopes = scope.split(' ').filter(Boolean);

  // Look up the client's display name. Requires a session — the user
  // is signed in by this point (Better-Auth redirected them to /signin
  // first if not). 404 means a stale link.
  let clientName: string = clientId;
  try {
    const clientRes = await apiFetch(
      event,
      `/v1/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
    );
    if (clientRes.ok) {
      const body = (await clientRes.json()) as PublicClient;
      if (body.client_name) clientName = body.client_name;
    }
  } catch {
    // Best-effort — fall back to the client_id as a label.
  }

  return {
    invalid: false as const,
    clientId,
    clientName,
    scopes,
    oauthQuery,
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const accept = form.get('decision') === 'accept';
    const oauthQuery = String(form.get('oauth_query') ?? '');
    const scope = String(form.get('scope') ?? '');

    if (!oauthQuery) {
      throw httpError(400, {
        message: 'Missing oauth_query',
        code: 'http_missing_oauth_query',
      });
    }

    const res = await apiFetch(event, '/v1/auth/oauth2/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accept,
        oauth_query: oauthQuery,
        // Forward the requested scope so the user could narrow it in
        // a future UI. For now we accept exactly what was asked.
        ...(scope ? { scope } : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw httpError(res.status, {
        message: text || 'Consent failed',
        code: 'http_consent_failed',
      });
    }

    const body = (await res.json()) as ConsentResponse;
    const target = body.url ?? body.redirect_uri;
    if (!target) {
      throw httpError(500, {
        message: 'Consent response missing redirect target',
        code: 'http_consent_missing_redirect',
      });
    }

    throw redirect(303, target);
  },
};
