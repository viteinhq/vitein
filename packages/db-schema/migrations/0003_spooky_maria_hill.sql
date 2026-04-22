CREATE TABLE IF NOT EXISTS "event_announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"template_id" text,
	"sent_at" timestamp with time zone,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_announcements" ADD CONSTRAINT "event_announcements_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_announcements_event_stage_idx" ON "event_announcements" USING btree ("event_id","stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_announcements_event_idx" ON "event_announcements" USING btree ("event_id");