import type { LayoutServerLoad } from './$types';

/**
 * Jurisdictions where a data-protection law requires an explicit
 * cookie-consent banner before non-essential tracking: GDPR (EU/EEA),
 * UK-GDPR, Switzerland's FADP, and India's DPDPA (added in Phase 1.5
 * alongside the India PPP market). ISO 3166-1 alpha-2 codes. Visitors
 * elsewhere still get the footer privacy notice, just not the banner.
 */
const CONSENT_REGION = new Set([
  // EU 27
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  // EEA non-EU
  'IS',
  'LI',
  'NO',
  // UK + Switzerland (FADP)
  'GB',
  'CH',
  // India — DPDPA (Phase 1.5 PPP market)
  'IN',
]);

export const load: LayoutServerLoad = ({ request, cookies }) => {
  // Cloudflare attaches the visitor's ISO country code as a header on
  // every request that hits our origin. Falls back to undefined in
  // local dev (no banner shown), which is fine — anything that
  // matters runs on staging or prod.
  const country = request.headers.get('cf-ipcountry') ?? undefined;
  const isConsentRegion = country ? CONSENT_REGION.has(country.toUpperCase()) : false;

  // `vitein_consent`: `accepted` | `essential`. Unset = the user
  // hasn't decided yet; the banner stays visible until they do.
  const existingChoice = cookies.get('vitein_consent') ?? null;

  // Cheap "signed in?" probe: the Better-Auth session cookie is
  // present iff there was at least one successful sign-in. We don't
  // verify the cookie here — that's the API's job on the next
  // request. The worst case is showing "Dashboard" instead of
  // "Sign in" for a user with an expired session; clicking it
  // redirects them back to /signin via the account layout guard.
  const signedIn =
    cookies.get('__Secure-better-auth.session_token') !== undefined ||
    cookies.get('better-auth.session_token') !== undefined;

  return {
    consent: {
      isConsentRegion,
      choice: existingChoice as 'accepted' | 'essential' | null,
    },
    signedIn,
  };
};
