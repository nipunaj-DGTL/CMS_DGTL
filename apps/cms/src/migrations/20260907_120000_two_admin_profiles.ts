import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "cms_users_company_roles" AS role
    USING "cms_users" AS account
    WHERE role."parent_id" = account."id"
      AND account."account_type" <> 'company';

    DELETE FROM "cms_users_tenants" AS assignment
    USING "cms_users" AS account
    WHERE assignment."_parent_id" = account."id"
      AND account."account_type" <> 'client';

    INSERT INTO "cms_users_company_roles" ("order", "parent_id", "value")
    SELECT 1, account."id", 'company-super-admin'
    FROM "cms_users" AS account
    WHERE account."account_type" = 'company'
      AND NOT EXISTS (
        SELECT 1
        FROM "cms_users_company_roles" AS role
        WHERE role."parent_id" = account."id"
      );

    INSERT INTO "cms_users_tenants_roles" ("order", "parent_id", "value")
    SELECT 1, assignment."id", 'client-owner'
    FROM "cms_users_tenants" AS assignment
    JOIN "cms_users" AS account ON account."id" = assignment."_parent_id"
    WHERE account."account_type" = 'client'
      AND NOT EXISTS (
        SELECT 1
        FROM "cms_users_tenants_roles" AS role
        WHERE role."parent_id" = assignment."id"
      );

    DELETE FROM "cms_users_company_roles" AS duplicate
    USING "cms_users_company_roles" AS retained
    WHERE duplicate."parent_id" = retained."parent_id"
      AND duplicate."id" > retained."id";

    CREATE TYPE "public"."enum_cms_users_company_roles_two_admin_profiles"
      AS ENUM('company-super-admin');
    ALTER TABLE "cms_users_company_roles"
      ALTER COLUMN "value"
      TYPE "public"."enum_cms_users_company_roles_two_admin_profiles"
      USING (
        CASE
          WHEN "value" IS NULL THEN NULL
          ELSE 'company-super-admin'
        END
      )::"public"."enum_cms_users_company_roles_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_company_roles";
    ALTER TYPE "public"."enum_cms_users_company_roles_two_admin_profiles"
      RENAME TO "enum_cms_users_company_roles";

    DELETE FROM "cms_users_tenants_roles" AS duplicate
    USING "cms_users_tenants_roles" AS retained
    WHERE duplicate."parent_id" = retained."parent_id"
      AND duplicate."id" > retained."id";

    CREATE TYPE "public"."enum_cms_users_tenants_roles_two_admin_profiles"
      AS ENUM('client-admin');
    ALTER TABLE "cms_users_tenants_roles"
      ALTER COLUMN "value"
      TYPE "public"."enum_cms_users_tenants_roles_two_admin_profiles"
      USING (
        CASE
          WHEN "value" IS NULL THEN NULL
          ELSE 'client-admin'
        END
      )::"public"."enum_cms_users_tenants_roles_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_tenants_roles";
    ALTER TYPE "public"."enum_cms_users_tenants_roles_two_admin_profiles"
      RENAME TO "enum_cms_users_tenants_roles";

    UPDATE "cms_users"
      SET "status" = 'suspended'
      WHERE "account_type" = 'service';
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type" DROP DEFAULT;
    CREATE TYPE "public"."enum_cms_users_account_type_two_admin_profiles"
      AS ENUM('company', 'client');
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type"
      TYPE "public"."enum_cms_users_account_type_two_admin_profiles"
      USING (
        CASE
          WHEN "account_type" = 'service' THEN 'client'
          ELSE "account_type"::text
        END
      )::"public"."enum_cms_users_account_type_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_account_type";
    ALTER TYPE "public"."enum_cms_users_account_type_two_admin_profiles"
      RENAME TO "enum_cms_users_account_type";
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type" SET DEFAULT 'client'::"public"."enum_cms_users_account_type";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_cms_users_company_roles_before_two_admin_profiles"
      AS ENUM('company-super-admin', 'company-content-manager');
    ALTER TABLE "cms_users_company_roles"
      ALTER COLUMN "value"
      TYPE "public"."enum_cms_users_company_roles_before_two_admin_profiles"
      USING "value"::text::"public"."enum_cms_users_company_roles_before_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_company_roles";
    ALTER TYPE "public"."enum_cms_users_company_roles_before_two_admin_profiles"
      RENAME TO "enum_cms_users_company_roles";

    CREATE TYPE "public"."enum_cms_users_tenants_roles_before_two_admin_profiles"
      AS ENUM('client-owner', 'client-editor', 'client-viewer');
    ALTER TABLE "cms_users_tenants_roles"
      ALTER COLUMN "value"
      TYPE "public"."enum_cms_users_tenants_roles_before_two_admin_profiles"
      USING (
        CASE
          WHEN "value" IS NULL THEN NULL
          ELSE 'client-owner'
        END
      )::"public"."enum_cms_users_tenants_roles_before_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_tenants_roles";
    ALTER TYPE "public"."enum_cms_users_tenants_roles_before_two_admin_profiles"
      RENAME TO "enum_cms_users_tenants_roles";

    CREATE TYPE "public"."enum_cms_users_account_type_before_two_admin_profiles"
      AS ENUM('company', 'client', 'service');
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type" DROP DEFAULT;
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type"
      TYPE "public"."enum_cms_users_account_type_before_two_admin_profiles"
      USING "account_type"::text::"public"."enum_cms_users_account_type_before_two_admin_profiles";
    DROP TYPE "public"."enum_cms_users_account_type";
    ALTER TYPE "public"."enum_cms_users_account_type_before_two_admin_profiles"
      RENAME TO "enum_cms_users_account_type";
    ALTER TABLE "cms_users"
      ALTER COLUMN "account_type" SET DEFAULT 'client'::"public"."enum_cms_users_account_type";
  `)
}
