import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_company_overview" ADD COLUMN "tagline" varchar;
  ALTER TABLE "pages_blocks_team_showcase_members" ADD COLUMN "name" varchar;
  ALTER TABLE "pages_blocks_team_showcase_members" ADD COLUMN "image_id" integer;
  ALTER TABLE "pages_blocks_team_showcase_members" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "pages_blocks_team_showcase" ADD COLUMN "back_label" varchar DEFAULT '← ALL PEOPLE';
  ALTER TABLE "pages_blocks_team_showcase" ADD COLUMN "profile_link_label" varchar DEFAULT 'VIEW LINKEDIN PROFILE ↗';
  ALTER TABLE "_pages_v_blocks_company_overview" ADD COLUMN "tagline" varchar;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" ADD COLUMN "name" varchar;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" ADD COLUMN "image_id" integer;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "_pages_v_blocks_team_showcase" ADD COLUMN "back_label" varchar DEFAULT '← ALL PEOPLE';
  ALTER TABLE "_pages_v_blocks_team_showcase" ADD COLUMN "profile_link_label" varchar DEFAULT 'VIEW LINKEDIN PROFILE ↗';
  ALTER TABLE "pages_blocks_team_showcase_members" ADD CONSTRAINT "pages_blocks_team_showcase_members_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" ADD CONSTRAINT "_pages_v_blocks_team_showcase_members_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_team_showcase_members_image_idx" ON "pages_blocks_team_showcase_members" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_team_showcase_members_image_idx" ON "_pages_v_blocks_team_showcase_members" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_team_showcase_members" DROP CONSTRAINT "pages_blocks_team_showcase_members_image_id_media_id_fk";

  ALTER TABLE "_pages_v_blocks_team_showcase_members" DROP CONSTRAINT "_pages_v_blocks_team_showcase_members_image_id_media_id_fk";

  DROP INDEX "pages_blocks_team_showcase_members_image_idx";
  DROP INDEX "_pages_v_blocks_team_showcase_members_image_idx";
  ALTER TABLE "pages_blocks_company_overview" DROP COLUMN "tagline";
  ALTER TABLE "pages_blocks_team_showcase_members" DROP COLUMN "name";
  ALTER TABLE "pages_blocks_team_showcase_members" DROP COLUMN "image_id";
  ALTER TABLE "pages_blocks_team_showcase_members" DROP COLUMN "linkedin";
  ALTER TABLE "pages_blocks_team_showcase" DROP COLUMN "back_label";
  ALTER TABLE "pages_blocks_team_showcase" DROP COLUMN "profile_link_label";
  ALTER TABLE "_pages_v_blocks_company_overview" DROP COLUMN "tagline";
  ALTER TABLE "_pages_v_blocks_team_showcase_members" DROP COLUMN "name";
  ALTER TABLE "_pages_v_blocks_team_showcase_members" DROP COLUMN "image_id";
  ALTER TABLE "_pages_v_blocks_team_showcase_members" DROP COLUMN "linkedin";
  ALTER TABLE "_pages_v_blocks_team_showcase" DROP COLUMN "back_label";
  ALTER TABLE "_pages_v_blocks_team_showcase" DROP COLUMN "profile_link_label";`)
}
