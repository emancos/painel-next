ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "room_id" uuid;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_room_id_rooms_id_fk') THEN
    ALTER TABLE "services" ADD CONSTRAINT "services_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_user_id_users_id_fk') THEN
    ALTER TABLE "services" ADD CONSTRAINT "services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'priorities_name_unique') THEN
    ALTER TABLE "priorities" ADD CONSTRAINT "priorities_name_unique" UNIQUE("name");
  END IF;
END $$;