CREATE TABLE "premium_email_grants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"tier" text DEFAULT 'plus' NOT NULL,
	"note" text,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "premium_email_grants" ADD CONSTRAINT "premium_email_grants_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "premium_email_grants_email_active_idx" ON "premium_email_grants" USING btree (lower("email")) WHERE "premium_email_grants"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "premium_email_grants_revoked_idx" ON "premium_email_grants" USING btree ("revoked_at");