# 0012 — Personal-tier events do not trigger bulk email

- **Status:** Accepted
- **Date:** 2026-05-23
- **Deciders:** Kim
- **Refines:** ARCHITECTURE §9.3 (compliance hooks)

## Context

Phase 1 ships an `event_announcements` mechanism: a creator clicks "Send Save-the-Date" / "Send Invitation" and the API iterates the `guests` rows with email addresses and dispatches a templated email via Resend.

The model has a consent problem. The Phase 1 product targets personal events (birthdays, weddings, dinners) created by anonymous users who type in friends' email addresses. We have no opt-in from those recipients, no relationship to them, and no way to verify that the creator has permission to invite them via email. GDPR's household exemption (Art 2(2)(c)) plausibly covers Kim sending an invitation to their friend, but it does not cover vite.in's role as the sending platform — we are an Auftragsverarbeiter without our own legal basis. The competitors' workaround ("you confirm you have permission to invite these people" in TOS, sender-attestation) is industry-standard but still a grey area, and the operational cost lands on us (Resend reputation, spam complaints, ICO/DPB exposure).

The product DNA — no account, share-link first — also makes the bulk-email path off-brand. A typical Phase 1 user already has WhatsApp, iMessage, native Mail. They don't need vite.in to send anything before someone has interacted with their event.

## Decision

On the personal tier (every account today), **vite.in does not send unsolicited email to guest-list addresses**. The legal model is: we only email people who have actively given us their email by RSVPing to a specific event — that act of RSVP is the consent signal scoped to that event's lifecycle.

Concretely:

- **Save the Date / Invitation become share-only.** Creator copies the event link and shares it via their own channels. A future stretch task may add a dedicated Save-the-Date preview page that renders the event with a sparser "details follow" framing.
- **RSVP-driven email stays.** Reminders, RSVP confirmations, and the magic-link to the creator are all fine — the recipient gave us their address by RSVPing (or by being the creator of the event).
- **The bulk-email code path stays in the codebase but is gated.** `POST /v1/events/:id/announcements` returns `403 feature.b2b_only` for every caller today. A `canSendBulkEmail(authContext)` helper is the single gate point — currently hardcoded `false`.

This unblocks Phase 1 from a class of risks (spam complaints, ICO investigations, sender-reputation hits) without removing any future option.

## B2B carve-out (Phase 2)

When the workspace / B2B tier exists, accounts that have signed an extended TOS variant — explicitly attesting recipient consent and accepting liability for spam complaints — may flip a workspace-level flag (`bulk_email_authorized`, or whatever the workspace model surfaces). `canSendBulkEmail` reads it; everything downstream (UI, gate, audit) lights up automatically because we did not delete it.

Design is deferred until the workspace model lands. The decision today is only "the code path survives, and the gate has one obvious place to grow."

## Alternatives considered

- **Evite / Punchbowl model (sender attestation in TOS, just send).** Rejected for now: legal exposure as the EU sender, Resend reputation risk, off-brand. The pattern is acceptable if the user accepts B2B-style terms (Phase 2 path above).
- **Double opt-in before any email.** Rejected: kills the Save-the-Date / Invitation use cases by definition — at those stages the recipient has not done anything to opt in. Would only work for reminders, which we already gate by RSVP.
- **Delete the announcements code entirely.** Rejected: the work has value once we add B2B; deleting it just means rebuilding it. Gating is one line.

## Consequences

- The manage page drops the two "Send Save-the-Date" / "Send Invitation" action buttons and replaces them with a `manage_announcements_share_instead` info Banner pointing back to the share-link affordance at the top of the page. Existing announcement-history Banners stay so events with pre-decision sends still show their history.
- `POST /v1/events/:id/announcements` documented to return `403 feature.b2b_only` for personal accounts.
- The `?/announce` SvelteKit action stays wired for future B2B use; with no UI trigger today, anyone posting it manually round-trips the API 403.
- New i18n key `manage_announcements_share_instead` seeded into all 20 locales (English placeholder; translations follow in the sweep).
- The premium-grant + `paid_features.tier` model is unchanged. `save_the_date` stays on the Plus feature list as a tier marker — it just no longer maps to an email action on Personal accounts. When the Save-the-Date _page_ feature lands as a follow-up, it inherits the existing tier gate.
- The risk register in ROADMAP.md ("payment disputes / chargebacks at global scale") gets a sibling we should track when B2B is on the table: spam-complaint risk for any future B2B bulk-send.

## References

- ARCHITECTURE §9.3 compliance hooks
- ROADMAP Phase 2 (B2B foundation)
- GDPR Art 2(2)(c) household exemption, Art 6(1)(a)(b)(f) lawful bases
- ePrivacy Directive 2002/58/EC, Art 13 (unsolicited communications)
