import type { LayoutServerLoad } from './$types';

/**
 * EU + EEA + UK + Switzerland — jurisdictions where GDPR (or near-
 * equivalent: UK-GDPR, FADP) requires an explicit cookie-consent
 * banner before non-essential tracking. ISO 3166-1 alpha-2 codes.
 * Non-EU visitors still see a privacy notice via the footer; they
 * just don't get the active banner.
 */
const GDPR_REGION = new Set([
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
]);

export const load: LayoutServerLoad = ({ request, cookies }) => {
  // Cloudflare attaches the visitor's ISO country code as a header on
  // every request that hits our origin. Falls back to undefined in
  // local dev (no banner shown), which is fine — anything that
  // matters runs on staging or prod.
  const country = request.headers.get('cf-ipcountry') ?? undefined;
  const isGdprRegion = country ? GDPR_REGION.has(country.toUpperCase()) : false;

  // `vitein_consent`: `accepted` | `essential`. Unset = the user
  // hasn't decided yet; the banner stays visible until they do.
  const existingChoice = cookies.get('vitein_consent') ?? null;

  return {
    consent: {
      isGdprRegion,
      choice: existingChoice as 'accepted' | 'essential' | null,
    },
  };
};
