import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cms_sso_sessions" (
    "id" serial PRIMARY KEY NOT NULL,
    "key_hash" varchar NOT NULL,
    "user_id" integer NOT NULL,
    "issuer" varchar NOT NULL,
    "subject" varchar NOT NULL,
    "encrypted_access_token" varchar NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "cms_users" ADD COLUMN "sso_issuer" varchar;
  ALTER TABLE "cms_users" ADD COLUMN "sso_subject" varchar;
  ALTER TABLE "cms_users" ADD COLUMN "sso_identity_key" varchar;
  ALTER TABLE "cms_sso_sessions" ADD CONSTRAINT "cms_sso_sessions_user_id_cms_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "cms_sso_sessions_key_hash_idx" ON "cms_sso_sessions" USING btree ("key_hash");
  CREATE INDEX "cms_sso_sessions_user_idx" ON "cms_sso_sessions" USING btree ("user_id");
  CREATE INDEX "cms_sso_sessions_expires_at_idx" ON "cms_sso_sessions" USING btree ("expires_at");
  CREATE INDEX "cms_sso_sessions_updated_at_idx" ON "cms_sso_sessions" USING btree ("updated_at");
  CREATE INDEX "cms_sso_sessions_created_at_idx" ON "cms_sso_sessions" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_users_sso_identity_key_idx" ON "cms_users" USING btree ("sso_identity_key");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms_sso_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms_sso_sessions" CASCADE;
  DROP INDEX "cms_users_sso_identity_key_idx";
  ALTER TABLE "cms_users" DROP COLUMN "sso_issuer";
  ALTER TABLE "cms_users" DROP COLUMN "sso_subject";
  ALTER TABLE "cms_users" DROP COLUMN "sso_identity_key";`)
}
