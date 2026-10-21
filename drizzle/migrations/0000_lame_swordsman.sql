CREATE TABLE "daily_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"current_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"number" smallint NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "priorities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(60) NOT NULL,
	"description" varchar(150),
	"weight" smallint DEFAULT 1 NOT NULL,
	"color_hex" varchar(7) DEFAULT '#06B6D4' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"prefix" varchar(3) NOT NULL,
	"weight" smallint DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"priority_id" integer NOT NULL,
	"location_id" uuid,
	"user_id" uuid,
	"ticket_number" integer NOT NULL,
	"ticket_prefix" varchar(3) NOT NULL,
	"formatted_ticket" varchar(10) NOT NULL,
	"status" varchar(25) DEFAULT 'ISSUED' NOT NULL,
	"resolution" varchar(20),
	"customer_name" varchar(120),
	"customer_doc" varchar(30),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets_history" (
	"id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"priority_id" integer NOT NULL,
	"location_id" uuid,
	"user_id" uuid,
	"ticket_number" integer NOT NULL,
	"ticket_prefix" varchar(3) NOT NULL,
	"formatted_ticket" varchar(10) NOT NULL,
	"status" varchar(25) NOT NULL,
	"resolution" varchar(20),
	"customer_name" varchar(120),
	"customer_doc" varchar(30),
	"created_at" timestamp with time zone NOT NULL,
	"called_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"wait_time_seconds" integer,
	"service_time_seconds" integer,
	"total_time_seconds" integer,
	"metadata" jsonb,
	CONSTRAINT "tickets_history_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_units" (
	"user_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	CONSTRAINT "user_units_user_id_unit_id_pk" PRIMARY KEY("user_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(120) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(30) DEFAULT 'ATTENDANT' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "daily_counters" ADD CONSTRAINT "daily_counters_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_counters" ADD CONSTRAINT "daily_counters_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_units" ADD CONSTRAINT "user_units_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_units" ADD CONSTRAINT "user_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_counter_date" ON "daily_counters" USING btree ("unit_id","service_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_location_unit" ON "locations" USING btree ("unit_id","name","number");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_service_prefix_unit" ON "services" USING btree ("unit_id","prefix");--> statement-breakpoint
CREATE INDEX "idx_tickets_queue" ON "tickets" USING btree ("unit_id","service_id","priority_id","created_at");