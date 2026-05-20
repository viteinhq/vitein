/**
 * Input shapes for each email type. Lifted out of email.ts so
 * email-templates.ts can import them without creating a circular module
 * dependency.
 */

export interface CreatorMagicLinkInput {
  to: string;
  eventTitle: string;
  manageUrl: string;
}

export interface SignInMagicLinkInput {
  to: string;
  url: string;
}

export interface RsvpConfirmationInput {
  to: string;
  eventTitle: string;
  status: 'yes' | 'maybe' | 'no';
  eventUrl: string;
}

export interface RsvpNotificationInput {
  to: string;
  eventTitle: string;
  guestName: string;
  status: 'yes' | 'maybe' | 'no';
  plusOnes: number;
  manageUrl: string;
}

export interface ReminderInput {
  to: string;
  eventTitle: string;
  startsAt: Date;
  eventUrl: string;
}

export interface AnnouncementInput {
  to: string;
  eventTitle: string;
  startsAt: Date;
  eventUrl: string;
  stage: 'save_the_date' | 'invitation';
}

/**
 * A rendered email ready for delivery. This is the message body carried on
 * the `QUEUE_EMAIL` Cloudflare Queue — the producer renders the template,
 * the queue consumer performs the Resend call.
 */
export interface EmailJob {
  to: string;
  subject: string;
  text: string;
  /** Free-form context for structured logging on the consumer side. */
  logHint?: Record<string, string>;
}
