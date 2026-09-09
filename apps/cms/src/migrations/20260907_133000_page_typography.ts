import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_pages_typography_font_family" AS ENUM('brand', 'sans', 'serif');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum__pages_v_version_typography_font_family" AS ENUM('brand', 'sans', 'serif');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "pages"
      ADD COLUMN IF NOT EXISTS "typography_font_family" "enum_pages_typography_font_family" DEFAULT 'brand';

    ALTER TABLE "_pages_v"
      ADD COLUMN IF NOT EXISTS "version_typography_font_family" "enum__pages_v_version_typography_font_family" DEFAULT 'brand';

    UPDATE "pages"
    SET "typography_font_family" = 'brand'
    WHERE "typography_font_family" IS NULL;

    UPDATE "_pages_v"
    SET "version_typography_font_family" = 'brand'
    WHERE "version_typography_font_family" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages" DROP COLUMN IF EXISTS "typography_font_family";
    ALTER TABLE "_pages_v" DROP COLUMN IF EXISTS "version_typography_font_family";
    DROP TYPE IF EXISTS "public"."enum_pages_typography_font_family";
    DROP TYPE IF EXISTS "public"."enum__pages_v_version_typography_font_family";
  `)
}
