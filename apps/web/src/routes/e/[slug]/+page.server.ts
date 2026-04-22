import { error as httpError, fail } from '@sveltejs/kit';
import { getEventBySlug, listMedia, submitRsvp, verifyEventPassword } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

const VIEW_TOKEN_COOKIE_PREFIX = 'vi_vt_';

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

export const load: PageServerLoad = async ({ params, platform, cookies }) => {
  configureApi(resolveBaseUrl(platform));

  const viewToken = cookies.get(`${VIEW_TOKEN_COOKIE_PREFIX}${params.slug}`);
  const viewHeaders: Record<string, string> = viewToken
    ? { 'X-Event-View-Token': viewToken }
    : {};

  const { data, error } = await getEventBySlug({
    path: { slug: params.slug },
    headers: viewHeaders,
  });
  if (error || !data) {
    throw httpError(404, { message: 'Event not found', code: 'http_event_not_found' });
  }

  const media = await listMedia({
    path: { id: data.id },
    headers: viewHeaders,
  });
  const items = media.data?.items ?? [];
  const cover = items.find((m) => m.kind === 'cover' && m.url) ?? null;
  const gallery = items.filter((m) => m.kind === 'gallery' && m.url);
  return { event: data, cover, gallery };
};

export const actions: Actions = {
  verifyPassword: async ({ request, params, platform, cookies, url }) => {
    configureApi(resolveBaseUrl(platform));
    const form = await request.formData();
    const password = String(form.get('password') ?? '');
    if (!password) return fail(400, { pwdError: 'pwd_required' });

    const event = await getEventBySlug({ path: { slug: params.slug } });
    if (event.error || !event.data) {
      return fail(404, { pwdError: 'pwd_event_not_found' });
    }

    const { data, error, response } = await verifyEventPassword({
      path: { id: event.data.id },
      body: { password },
    });

    if (error || !data) {
      if (response?.status === 401) return fail(401, { pwdError: 'pwd_invalid' });
      return fail(response?.status ?? 500, { pwdError: 'pwd_failed' });
    }

    cookies.set(`${VIEW_TOKEN_COOKIE_PREFIX}${params.slug}`, data.token, {
      path: `/e/${params.slug}`,
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: data.ttlSeconds,
    });
    return { pwdUnlocked: true };
  },

  rsvp: async ({ request, params, platform }) => {
    configureApi(resolveBaseUrl(platform));

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim() || null;
    const status = String(form.get('status') ?? 'yes') as 'yes' | 'maybe' | 'no';
    const message = String(form.get('message') ?? '').trim() || null;
    const plusOnesRaw = Number(form.get('plusOnes') ?? 0);
    const plusOnes = Number.isFinite(plusOnesRaw) ? Math.max(0, Math.min(20, plusOnesRaw)) : 0;

    // Named plus-ones (Plus tier). The form sends one `plusOneName` input
    // per +1 slot; we collect them, trim, drop empties, and clamp to the
    // declared plusOnes count. The API drops this on Basic events.
    const plusOnesDetails = form
      .getAll('plusOneName')
      .map((v) => String(v).trim())
      .filter((v) => v.length > 0)
      .slice(0, plusOnes)
      .map((name) => ({ name }));

    if (!name) {
      return fail(400, { rsvpError: 'rsvp_name_required' });
    }

    const event = await getEventBySlug({ path: { slug: params.slug } });
    if (event.error || !event.data) {
      return fail(404, { rsvpError: 'rsvp_event_not_found' });
    }

    const { data, error } = await submitRsvp({
      path: { id: event.data.id },
      body: { name, email, status, message, plusOnes, plusOnesDetails },
    });

    if (error || !data) {
      return fail(500, { rsvpError: 'rsvp_failed' });
    }

    return { rsvpSuccess: true, rsvpStatus: data.status, rsvpName: name };
  },
};
