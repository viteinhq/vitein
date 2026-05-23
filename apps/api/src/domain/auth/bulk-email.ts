import type { AuthContext } from './context.js';

/**
 * Whether the current auth context may trigger a bulk-email send
 * (Save-the-Date / Invitation announcements).
 *
 * Hardcoded to `false` today: per ADR 0012, the personal tier does not
 * send unsolicited email to guest-list addresses. The single gate point
 * stays so a future workspace / B2B account model can flip it on by
 * checking a workspace-level `bulk_email_authorized` flag once that
 * field exists.
 *
 * Do not inline this check. Future B2B work needs one obvious place to
 * extend; route handlers calling the helper get the upgrade for free.
 */
export function canSendBulkEmail(_auth: AuthContext): boolean {
  return false;
}
