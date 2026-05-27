ALTER TABLE "events" ALTER COLUMN "template_id" SET DEFAULT 'volt';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "font_pairing" text DEFAULT 'bricolage-geist' NOT NULL;--> statement-breakpoint
-- Data backfill for the 2026-05-26 theme-engine rename. Both UPDATEs are
-- safe to re-run; nothing references the old ids after this point.
-- `classic` palette → `volt` (same colours, new id).
UPDATE "events" SET "template_id" = 'volt' WHERE "template_id" = 'classic';--> statement-breakpoint
-- `serif` palette was a palette+font mash-up; the engine separates the
-- axes. Map to the closest single palette + the matching font pairing
-- so existing events render almost-identically.
UPDATE "events" SET "template_id" = 'paper', "font_pairing" = 'instrument-instrument' WHERE "template_id" = 'serif';