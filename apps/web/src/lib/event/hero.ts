/** The event fields an event-page hero renders (a subset of `EventPublic`). */
export interface EventHeroData {
  title: string;
  startsAt: string;
  endsAt?: string | null;
  timezone: string;
  locationText?: string | null;
}

/**
 * Props shared by every event-page hero layout (ADR 0009 M2). The page
 * computes the timezone-formatted strings once and passes them in, so the
 * heroes stay presentational and the two layouts are interchangeable.
 */
export interface EventHeroProps {
  event: EventHeroData;
  cover: { url?: string | null } | null | undefined;
  startsInEventTz: string;
  endsInEventTz: string | null;
  showLocalTime: boolean;
  startsInViewerTz: string;
}
