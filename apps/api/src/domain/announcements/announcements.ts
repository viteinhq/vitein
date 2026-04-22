import {
  and,
  auditLog,
  eq,
  eventAnnouncements,
  events,
  guests,
  isNull,
  type Db,
} from '@vitein/db-schema';
import { ConflictError, DomainError, NotFoundError, ValidationError } from '../errors.js';

export type AnnouncementStage = 'save_the_date' | 'invitation';

export interface AnnouncementRow {
  id: string;
  eventId: string;
  stage: AnnouncementStage;
  templateId: string | null;
  sentAt: Date | null;
  recipientCount: number;
  createdAt: Date;
}

/** Max guests a synchronous send will hit before we force an async path. */
export const MAX_SYNC_RECIPIENTS = 100;

export async function listAnnouncements(db: Db, eventId: string): Promise<AnnouncementRow[]> {
  const rows = await db
    .select()
    .from(eventAnnouncements)
    .where(eq(eventAnnouncements.eventId, eventId));
  return rows.map((r) => ({
    id: r.id,
    eventId: r.eventId,
    stage: r.stage as AnnouncementStage,
    templateId: r.templateId,
    sentAt: r.sentAt,
    recipientCount: r.recipientCount,
    createdAt: r.createdAt,
  }));
}

export interface PrepareAnnouncementResult {
  event: typeof events.$inferSelect;
  recipients: string[];
  row: typeof eventAnnouncements.$inferSelect;
}

/**
 * Insert an `event_announcements` row in the "queued" state (sent_at = null)
 * and collect the guest-email list. Enforces the once-per-stage rule via the
 * unique index. The actual email dispatch happens in the route handler so
 * tests can stub Resend without touching the DB.
 */
export async function prepareAnnouncement(
  db: Db,
  eventId: string,
  stage: AnnouncementStage,
): Promise<PrepareAnnouncementResult> {
  if (stage !== 'save_the_date' && stage !== 'invitation') {
    throw new ValidationError('Unknown announcement stage', { stage });
  }

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) throw new NotFoundError('event.not_found', 'Event not found');

  const guestRows = await db
    .select({ email: guests.email })
    .from(guests)
    .where(eq(guests.eventId, eventId));
  const recipients = guestRows
    .map((g) => g.email?.trim() ?? '')
    .filter((e) => e.length > 0);

  if (recipients.length === 0) {
    throw new ValidationError('No guests with email addresses on the invite list');
  }
  if (recipients.length > MAX_SYNC_RECIPIENTS) {
    throw new DomainError(
      'announcement.too_many_recipients',
      `Guest list has ${String(recipients.length)} recipients; max ${String(MAX_SYNC_RECIPIENTS)} per send in this MVP`,
      413,
    );
  }

  let row: typeof eventAnnouncements.$inferSelect;
  try {
    const [inserted] = await db
      .insert(eventAnnouncements)
      .values({ eventId, stage, recipientCount: recipients.length })
      .returning();
    if (!inserted) throw new Error('Announcement insert returned no row');
    row = inserted;
  } catch (err) {
    if (isUniqueAnnouncementError(err)) {
      throw new ConflictError(
        'announcement.already_sent',
        `A ${stage} announcement has already been sent for this event`,
      );
    }
    throw err;
  }

  return { event, recipients, row };
}

/** Stamp sent_at + append audit-log row once all emails finished. */
export async function markAnnouncementSent(
  db: Db,
  announcementId: string,
  eventId: string,
  stage: AnnouncementStage,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db
    .update(eventAnnouncements)
    .set({ sentAt: new Date() })
    .where(eq(eventAnnouncements.id, announcementId));
  await db.insert(auditLog).values({
    actorType: 'creator_token',
    actorId: `event:${eventId}`,
    eventId,
    action: `announcement.${stage}.sent`,
    metadata,
  });
}

function isUniqueAnnouncementError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = 'message' in err && typeof err.message === 'string' ? err.message : '';
  return (
    message.includes('event_announcements_event_stage_idx') || message.includes('duplicate key')
  );
}
