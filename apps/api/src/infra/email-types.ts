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
