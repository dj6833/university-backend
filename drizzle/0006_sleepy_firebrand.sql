CREATE TYPE "public"."document_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."document_type_enum" AS ENUM('student_welcome_pack');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"document_type" "document_type_enum" NOT NULL,
	"status" "document_status_enum" DEFAULT 'pending' NOT NULL,
	"requested_by_end_user" boolean DEFAULT false NOT NULL,
	"file_url" varchar(2048),
	"file_name" varchar(255),
	"error_message" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_processing_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_user_pending_visibility_idx" ON "documents" USING btree ("user_id","requested_by_end_user","status");