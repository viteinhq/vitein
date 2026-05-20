import type { Locale } from '@vitein/i18n-messages';

/**
 * Localized copy for push notifications.
 *
 * v1 ships `en` + `de`; other locales fall back to `en` until the push
 * strings join the regular i18n translation sweep (the email templates
 * went through the same staged rollout).
 */

export interface RsvpPushInput {
  guestName: string;
  status: 'yes' | 'maybe' | 'no';
  eventTitle: string;
}

export interface PushText {
  title: string;
  body: string;
}

const RSVP_VERB: Record<'en' | 'de', Record<'yes' | 'maybe' | 'no', string>> = {
  en: { yes: 'is coming', maybe: 'might come', no: "can't make it" },
  de: { yes: 'sagt zu', maybe: 'kommt vielleicht', no: 'sagt ab' },
};

/** Notification for the creator when a guest RSVPs. */
export function rsvpPushText(locale: Locale | undefined, input: RsvpPushInput): PushText {
  const lang = locale === 'de' ? 'de' : 'en';
  return {
    title: input.eventTitle,
    body: `${input.guestName} ${RSVP_VERB[lang][input.status]}`,
  };
}
