import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dgtl_tenants_status" AS ENUM('draft', 'active', 'suspended', 'archived');
  CREATE TYPE "public"."enum_cms_users_company_roles" AS ENUM('company-super-admin', 'company-content-manager');
  CREATE TYPE "public"."enum_cms_users_tenants_roles" AS ENUM('client-owner', 'client-editor', 'client-viewer');
  CREATE TYPE "public"."enum_cms_users_account_type" AS ENUM('company', 'client', 'service');
  CREATE TYPE "public"."enum_cms_users_status" AS ENUM('invited', 'active', 'suspended');
  CREATE TYPE "public"."enum_websites_status" AS ENUM('draft', 'active', 'maintenance', 'suspended');
  CREATE TYPE "public"."enum_pages_blocks_image_text_alignment" AS ENUM('image-left', 'image-right');
  CREATE TYPE "public"."enum_pages_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_pages_template" AS ENUM('standard', 'landing', 'contact');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_image_text_alignment" AS ENUM('image-left', 'image-right');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__pages_v_version_template" AS ENUM('standard', 'landing', 'contact');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_posts_blocks_image_text_alignment" AS ENUM('image-left', 'image-right');
  CREATE TYPE "public"."enum_posts_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_blocks_image_text_alignment" AS ENUM('image-left', 'image-right');
  CREATE TYPE "public"."enum__posts_v_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_classification" AS ENUM('public', 'private-admin');
  CREATE TYPE "public"."enum_media_scan_status" AS ENUM('pending', 'clean', 'rejected');
  CREATE TYPE "public"."enum_navigation_location" AS ENUM('header', 'footer');
  CREATE TYPE "public"."enum_content_requests_priority" AS ENUM('low', 'normal', 'high', 'urgent');
  CREATE TYPE "public"."enum_content_requests_status" AS ENUM('submitted', 'reviewing', 'needs-information', 'in-progress', 'client-review', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_activity_events_actor_type" AS ENUM('company', 'client', 'service');
  CREATE TYPE "public"."enum_activity_events_outcome" AS ENUM('succeeded', 'failed', 'denied');
  CREATE TYPE "public"."enum_revalidation_deliveries_state" AS ENUM('pending', 'delivering', 'succeeded', 'retrying', 'failed');
  CREATE TABLE "dgtl_tenants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"display_name" varchar NOT NULL,
  	"status" "enum_dgtl_tenants_status" DEFAULT 'draft' NOT NULL,
  	"primary_contact_name" varchar,
  	"primary_contact_email" varchar,
  	"branding_logo_id" integer,
  	"branding_primary_color" varchar,
  	"notes" varchar,
  	"activated_at" timestamp(3) with time zone,
  	"suspended_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cms_users_company_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_cms_users_company_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms_users_tenants_roles" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_cms_users_tenants_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "cms_users_tenants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tenant_id" integer NOT NULL
  );
  
  CREATE TABLE "cms_users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "cms_users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"display_name" varchar NOT NULL,
  	"account_type" "enum_cms_users_account_type" DEFAULT 'client' NOT NULL,
  	"status" "enum_cms_users_status" DEFAULT 'invited' NOT NULL,
  	"last_login_at" timestamp(3) with time zone,
  	"invited_by_id" integer,
  	"password_changed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "websites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"key" varchar NOT NULL,
  	"display_name" varchar NOT NULL,
  	"status" "enum_websites_status" DEFAULT 'draft' NOT NULL,
  	"domain" varchar NOT NULL,
  	"preview_domain" varchar,
  	"frontend_key" varchar DEFAULT 'frontend-family-01' NOT NULL,
  	"content_model_version" numeric DEFAULT 1 NOT NULL,
  	"revalidation_url" varchar,
  	"revalidation_secret_ref" varchar,
  	"media_base_url" varchar,
  	"homepage_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum_pages_blocks_image_text_alignment" DEFAULT 'image-left',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "pages_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_contact_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_pages_blocks_spacer_size" DEFAULT 'medium',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"template" "enum_pages_template" DEFAULT 'standard',
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"show_in_navigation" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"archived_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum__pages_v_blocks_image_text_alignment" DEFAULT 'image-left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_contact_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__pages_v_blocks_spacer_size" DEFAULT 'medium',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_website_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_template" "enum__pages_v_version_template" DEFAULT 'standard',
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_show_in_navigation" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "posts_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "posts_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum_posts_blocks_image_text_alignment" DEFAULT 'image-left',
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "posts_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar
  );
  
  CREATE TABLE "posts_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_contact_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_logo_cloud_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"url" varchar
  );
  
  CREATE TABLE "posts_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_posts_blocks_spacer_size" DEFAULT 'medium',
  	"block_name" varchar
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer,
  	"title" varchar,
  	"slug" varchar,
  	"excerpt" varchar,
  	"featured_image_id" integer,
  	"author_display_name" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"seo_og_image_id" integer,
  	"seo_no_index" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"archived_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_posts_v_blocks_hero_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_image_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"image_id" integer,
  	"alignment" "enum__posts_v_blocks_image_text_alignment" DEFAULT 'image-left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_contact_details" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"email" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_logo_cloud_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__posts_v_blocks_spacer_size" DEFAULT 'medium',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_tenant_id" integer,
  	"version_website_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_excerpt" varchar,
  	"version_featured_image_id" integer,
  	"version_author_display_name" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_archived_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_posts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer NOT NULL,
  	"alt" varchar,
  	"decorative" boolean DEFAULT false,
  	"caption" varchar,
  	"credit" varchar,
  	"classification" "enum_media_classification" DEFAULT 'public' NOT NULL,
  	"checksum" varchar,
  	"scan_status" "enum_media_scan_status" DEFAULT 'clean' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "navigation_items_children" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"page_id" integer,
  	"external_u_r_l" varchar,
  	"new_tab" boolean DEFAULT false,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "navigation_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"page_id" integer,
  	"external_u_r_l" varchar,
  	"new_tab" boolean DEFAULT false,
  	"enabled" boolean DEFAULT true,
  	"order" numeric DEFAULT 0
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer NOT NULL,
  	"location" "enum_navigation_location" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer NOT NULL,
  	"display_name" varchar NOT NULL,
  	"logo_id" integer,
  	"favicon_id" integer,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"contact_address" varchar,
  	"default_s_e_o_title" varchar,
  	"default_s_e_o_description" varchar,
  	"default_s_e_o_social_image_id" integer,
  	"footer_text" varchar,
  	"analytics_reference" varchar,
  	"locale" varchar DEFAULT 'en',
  	"timezone" varchar DEFAULT 'Asia/Colombo',
  	"maintenance_enabled" boolean DEFAULT false,
  	"maintenance_message" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_requests_comments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"author_id" integer NOT NULL,
  	"message" varchar NOT NULL,
  	"created_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "content_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer NOT NULL,
  	"requester_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"target_page_id" integer,
  	"priority" "enum_content_requests_priority" DEFAULT 'normal' NOT NULL,
  	"assigned_to_id" integer,
  	"status" "enum_content_requests_status" DEFAULT 'submitted' NOT NULL,
  	"internal_notes" varchar,
  	"requested_due_date" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"resulting_page_id" integer,
  	"resulting_version_i_d" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_requests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "activity_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer,
  	"actor_i_d" varchar NOT NULL,
  	"actor_display_name" varchar NOT NULL,
  	"actor_type" "enum_activity_events_actor_type" NOT NULL,
  	"action" varchar NOT NULL,
  	"target_collection" varchar NOT NULL,
  	"target_i_d" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"request_i_d" varchar,
  	"outcome" "enum_activity_events_outcome" NOT NULL,
  	"timestamp" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "activity_events_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "revalidation_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tenant_id" integer,
  	"website_id" integer NOT NULL,
  	"source_collection" varchar NOT NULL,
  	"source_document_i_d" varchar NOT NULL,
  	"source_version_i_d" varchar,
  	"event_type" varchar NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"state" "enum_revalidation_deliveries_state" DEFAULT 'pending' NOT NULL,
  	"attempt_count" numeric DEFAULT 0 NOT NULL,
  	"next_attempt_at" timestamp(3) with time zone,
  	"last_safe_error" varchar,
  	"response_status" numeric,
  	"completed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "revalidation_deliveries_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"dgtl_tenants_id" integer,
  	"cms_users_id" integer,
  	"websites_id" integer,
  	"pages_id" integer,
  	"posts_id" integer,
  	"media_id" integer,
  	"navigation_id" integer,
  	"site_settings_id" integer,
  	"content_requests_id" integer,
  	"activity_events_id" integer,
  	"revalidation_deliveries_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cms_users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "dgtl_tenants" ADD CONSTRAINT "dgtl_tenants_branding_logo_id_media_id_fk" FOREIGN KEY ("branding_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_users_company_roles" ADD CONSTRAINT "cms_users_company_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_users_tenants_roles" ADD CONSTRAINT "cms_users_tenants_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."cms_users_tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_users_tenants" ADD CONSTRAINT "cms_users_tenants_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms_users_tenants" ADD CONSTRAINT "cms_users_tenants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_users_sessions" ADD CONSTRAINT "cms_users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms_users" ADD CONSTRAINT "cms_users_invited_by_id_cms_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "websites" ADD CONSTRAINT "websites_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "websites" ADD CONSTRAINT "websites_homepage_id_pages_id_fk" FOREIGN KEY ("homepage_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_links" ADD CONSTRAINT "pages_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_image_text" ADD CONSTRAINT "pages_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_card_grid_cards" ADD CONSTRAINT "pages_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_card_grid" ADD CONSTRAINT "pages_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_gallery" ADD CONSTRAINT "pages_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_contact_details" ADD CONSTRAINT "pages_blocks_contact_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_items" ADD CONSTRAINT "pages_blocks_logo_cloud_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_items" ADD CONSTRAINT "pages_blocks_logo_cloud_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud" ADD CONSTRAINT "pages_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_spacer" ADD CONSTRAINT "pages_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_links" ADD CONSTRAINT "_pages_v_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_image_text" ADD CONSTRAINT "_pages_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_card_grid_cards" ADD CONSTRAINT "_pages_v_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_card_grid" ADD CONSTRAINT "_pages_v_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_gallery" ADD CONSTRAINT "_pages_v_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_contact_details" ADD CONSTRAINT "_pages_v_blocks_contact_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_items" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_items" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_spacer" ADD CONSTRAINT "_pages_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_website_id_websites_id_fk" FOREIGN KEY ("version_website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero_links" ADD CONSTRAINT "posts_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero" ADD CONSTRAINT "posts_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero" ADD CONSTRAINT "posts_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_rich_text" ADD CONSTRAINT "posts_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_image_text" ADD CONSTRAINT "posts_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_image_text" ADD CONSTRAINT "posts_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_call_to_action" ADD CONSTRAINT "posts_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_card_grid_cards" ADD CONSTRAINT "posts_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_card_grid" ADD CONSTRAINT "posts_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_gallery" ADD CONSTRAINT "posts_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_faq_items" ADD CONSTRAINT "posts_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_faq" ADD CONSTRAINT "posts_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_contact_details" ADD CONSTRAINT "posts_blocks_contact_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_cloud_items" ADD CONSTRAINT "posts_blocks_logo_cloud_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_cloud_items" ADD CONSTRAINT "posts_blocks_logo_cloud_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_cloud" ADD CONSTRAINT "posts_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_spacer" ADD CONSTRAINT "posts_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_texts" ADD CONSTRAINT "posts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero_links" ADD CONSTRAINT "_posts_v_blocks_hero_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero" ADD CONSTRAINT "_posts_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero" ADD CONSTRAINT "_posts_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_rich_text" ADD CONSTRAINT "_posts_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_image_text" ADD CONSTRAINT "_posts_v_blocks_image_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_image_text" ADD CONSTRAINT "_posts_v_blocks_image_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_call_to_action" ADD CONSTRAINT "_posts_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_card_grid_cards" ADD CONSTRAINT "_posts_v_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_card_grid" ADD CONSTRAINT "_posts_v_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_gallery" ADD CONSTRAINT "_posts_v_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_faq_items" ADD CONSTRAINT "_posts_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_faq" ADD CONSTRAINT "_posts_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_contact_details" ADD CONSTRAINT "_posts_v_blocks_contact_details_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_cloud_items" ADD CONSTRAINT "_posts_v_blocks_logo_cloud_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_cloud_items" ADD CONSTRAINT "_posts_v_blocks_logo_cloud_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_cloud" ADD CONSTRAINT "_posts_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_spacer" ADD CONSTRAINT "_posts_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("version_tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_website_id_websites_id_fk" FOREIGN KEY ("version_website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_featured_image_id_media_id_fk" FOREIGN KEY ("version_featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_texts" ADD CONSTRAINT "_posts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_items_children" ADD CONSTRAINT "navigation_items_children_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_items_children" ADD CONSTRAINT "navigation_items_children_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation" ADD CONSTRAINT "navigation_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "navigation" ADD CONSTRAINT "navigation_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_s_e_o_social_image_id_media_id_fk" FOREIGN KEY ("default_s_e_o_social_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests_comments" ADD CONSTRAINT "content_requests_comments_author_id_cms_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests_comments" ADD CONSTRAINT "content_requests_comments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."content_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_requester_id_cms_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_target_page_id_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_assigned_to_id_cms_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."cms_users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_resulting_page_id_pages_id_fk" FOREIGN KEY ("resulting_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_requests_rels" ADD CONSTRAINT "content_requests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_requests_rels" ADD CONSTRAINT "content_requests_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "activity_events_texts" ADD CONSTRAINT "activity_events_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."activity_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "revalidation_deliveries" ADD CONSTRAINT "revalidation_deliveries_tenant_id_dgtl_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revalidation_deliveries" ADD CONSTRAINT "revalidation_deliveries_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revalidation_deliveries_texts" ADD CONSTRAINT "revalidation_deliveries_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."revalidation_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dgtl_tenants_fk" FOREIGN KEY ("dgtl_tenants_id") REFERENCES "public"."dgtl_tenants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cms_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_websites_fk" FOREIGN KEY ("websites_id") REFERENCES "public"."websites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_navigation_fk" FOREIGN KEY ("navigation_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_site_settings_fk" FOREIGN KEY ("site_settings_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_requests_fk" FOREIGN KEY ("content_requests_id") REFERENCES "public"."content_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_activity_events_fk" FOREIGN KEY ("activity_events_id") REFERENCES "public"."activity_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_revalidation_deliveries_fk" FOREIGN KEY ("revalidation_deliveries_id") REFERENCES "public"."revalidation_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_cms_users_fk" FOREIGN KEY ("cms_users_id") REFERENCES "public"."cms_users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "dgtl_tenants_key_idx" ON "dgtl_tenants" USING btree ("key");
  CREATE INDEX "dgtl_tenants_branding_branding_logo_idx" ON "dgtl_tenants" USING btree ("branding_logo_id");
  CREATE INDEX "dgtl_tenants_updated_at_idx" ON "dgtl_tenants" USING btree ("updated_at");
  CREATE INDEX "dgtl_tenants_created_at_idx" ON "dgtl_tenants" USING btree ("created_at");
  CREATE INDEX "cms_users_company_roles_order_idx" ON "cms_users_company_roles" USING btree ("order");
  CREATE INDEX "cms_users_company_roles_parent_idx" ON "cms_users_company_roles" USING btree ("parent_id");
  CREATE INDEX "cms_users_tenants_roles_order_idx" ON "cms_users_tenants_roles" USING btree ("order");
  CREATE INDEX "cms_users_tenants_roles_parent_idx" ON "cms_users_tenants_roles" USING btree ("parent_id");
  CREATE INDEX "cms_users_tenants_order_idx" ON "cms_users_tenants" USING btree ("_order");
  CREATE INDEX "cms_users_tenants_parent_id_idx" ON "cms_users_tenants" USING btree ("_parent_id");
  CREATE INDEX "cms_users_tenants_tenant_idx" ON "cms_users_tenants" USING btree ("tenant_id");
  CREATE INDEX "cms_users_sessions_order_idx" ON "cms_users_sessions" USING btree ("_order");
  CREATE INDEX "cms_users_sessions_parent_id_idx" ON "cms_users_sessions" USING btree ("_parent_id");
  CREATE INDEX "cms_users_invited_by_idx" ON "cms_users" USING btree ("invited_by_id");
  CREATE INDEX "cms_users_updated_at_idx" ON "cms_users" USING btree ("updated_at");
  CREATE INDEX "cms_users_created_at_idx" ON "cms_users" USING btree ("created_at");
  CREATE UNIQUE INDEX "cms_users_email_idx" ON "cms_users" USING btree ("email");
  CREATE INDEX "websites_tenant_idx" ON "websites" USING btree ("tenant_id");
  CREATE UNIQUE INDEX "websites_key_idx" ON "websites" USING btree ("key");
  CREATE UNIQUE INDEX "websites_domain_idx" ON "websites" USING btree ("domain");
  CREATE INDEX "websites_homepage_idx" ON "websites" USING btree ("homepage_id");
  CREATE INDEX "websites_updated_at_idx" ON "websites" USING btree ("updated_at");
  CREATE INDEX "websites_created_at_idx" ON "websites" USING btree ("created_at");
  CREATE INDEX "pages_blocks_hero_links_order_idx" ON "pages_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_links_parent_id_idx" ON "pages_blocks_hero_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_order_idx" ON "pages_blocks_image_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_text_parent_id_idx" ON "pages_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_text_path_idx" ON "pages_blocks_image_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_text_image_idx" ON "pages_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "pages_blocks_card_grid_cards_order_idx" ON "pages_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_cards_parent_id_idx" ON "pages_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_order_idx" ON "pages_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_parent_id_idx" ON "pages_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_path_idx" ON "pages_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_gallery_order_idx" ON "pages_blocks_gallery" USING btree ("_order");
  CREATE INDEX "pages_blocks_gallery_parent_id_idx" ON "pages_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_gallery_path_idx" ON "pages_blocks_gallery" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_contact_details_order_idx" ON "pages_blocks_contact_details" USING btree ("_order");
  CREATE INDEX "pages_blocks_contact_details_parent_id_idx" ON "pages_blocks_contact_details" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_contact_details_path_idx" ON "pages_blocks_contact_details" USING btree ("_path");
  CREATE INDEX "pages_blocks_logo_cloud_items_order_idx" ON "pages_blocks_logo_cloud_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_items_parent_id_idx" ON "pages_blocks_logo_cloud_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_items_image_idx" ON "pages_blocks_logo_cloud_items" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_cloud_order_idx" ON "pages_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_parent_id_idx" ON "pages_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_path_idx" ON "pages_blocks_logo_cloud" USING btree ("_path");
  CREATE INDEX "pages_blocks_spacer_order_idx" ON "pages_blocks_spacer" USING btree ("_order");
  CREATE INDEX "pages_blocks_spacer_parent_id_idx" ON "pages_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_path_idx" ON "pages_blocks_spacer" USING btree ("_path");
  CREATE INDEX "pages_tenant_idx" ON "pages" USING btree ("tenant_id");
  CREATE INDEX "pages_website_idx" ON "pages" USING btree ("website_id");
  CREATE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_media_id_idx" ON "pages_rels" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_hero_links_order_idx" ON "_pages_v_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_links_parent_id_idx" ON "_pages_v_blocks_hero_links" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "_pages_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_order_idx" ON "_pages_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_image_text_parent_id_idx" ON "_pages_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_image_text_path_idx" ON "_pages_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_image_text_image_idx" ON "_pages_v_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_card_grid_cards_order_idx" ON "_pages_v_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_card_grid_cards_parent_id_idx" ON "_pages_v_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_order_idx" ON "_pages_v_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_card_grid_parent_id_idx" ON "_pages_v_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_card_grid_path_idx" ON "_pages_v_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_gallery_order_idx" ON "_pages_v_blocks_gallery" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_gallery_parent_id_idx" ON "_pages_v_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_gallery_path_idx" ON "_pages_v_blocks_gallery" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_contact_details_order_idx" ON "_pages_v_blocks_contact_details" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_contact_details_parent_id_idx" ON "_pages_v_blocks_contact_details" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_contact_details_path_idx" ON "_pages_v_blocks_contact_details" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_logo_cloud_items_order_idx" ON "_pages_v_blocks_logo_cloud_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_items_parent_id_idx" ON "_pages_v_blocks_logo_cloud_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_items_image_idx" ON "_pages_v_blocks_logo_cloud_items" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_order_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_parent_id_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_path_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_spacer_order_idx" ON "_pages_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_spacer_parent_id_idx" ON "_pages_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_path_idx" ON "_pages_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_tenant_idx" ON "_pages_v" USING btree ("version_tenant_id");
  CREATE INDEX "_pages_v_version_version_website_idx" ON "_pages_v" USING btree ("version_website_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_media_id_idx" ON "_pages_v_rels" USING btree ("media_id");
  CREATE INDEX "posts_blocks_hero_links_order_idx" ON "posts_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "posts_blocks_hero_links_parent_id_idx" ON "posts_blocks_hero_links" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_hero_order_idx" ON "posts_blocks_hero" USING btree ("_order");
  CREATE INDEX "posts_blocks_hero_parent_id_idx" ON "posts_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_hero_path_idx" ON "posts_blocks_hero" USING btree ("_path");
  CREATE INDEX "posts_blocks_hero_image_idx" ON "posts_blocks_hero" USING btree ("image_id");
  CREATE INDEX "posts_blocks_rich_text_order_idx" ON "posts_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_rich_text_parent_id_idx" ON "posts_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_rich_text_path_idx" ON "posts_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_image_text_order_idx" ON "posts_blocks_image_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_image_text_parent_id_idx" ON "posts_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_image_text_path_idx" ON "posts_blocks_image_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_image_text_image_idx" ON "posts_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "posts_blocks_call_to_action_order_idx" ON "posts_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "posts_blocks_call_to_action_parent_id_idx" ON "posts_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_call_to_action_path_idx" ON "posts_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "posts_blocks_card_grid_cards_order_idx" ON "posts_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "posts_blocks_card_grid_cards_parent_id_idx" ON "posts_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_card_grid_order_idx" ON "posts_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "posts_blocks_card_grid_parent_id_idx" ON "posts_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_card_grid_path_idx" ON "posts_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "posts_blocks_gallery_order_idx" ON "posts_blocks_gallery" USING btree ("_order");
  CREATE INDEX "posts_blocks_gallery_parent_id_idx" ON "posts_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_gallery_path_idx" ON "posts_blocks_gallery" USING btree ("_path");
  CREATE INDEX "posts_blocks_faq_items_order_idx" ON "posts_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_faq_items_parent_id_idx" ON "posts_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_faq_order_idx" ON "posts_blocks_faq" USING btree ("_order");
  CREATE INDEX "posts_blocks_faq_parent_id_idx" ON "posts_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_faq_path_idx" ON "posts_blocks_faq" USING btree ("_path");
  CREATE INDEX "posts_blocks_contact_details_order_idx" ON "posts_blocks_contact_details" USING btree ("_order");
  CREATE INDEX "posts_blocks_contact_details_parent_id_idx" ON "posts_blocks_contact_details" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_contact_details_path_idx" ON "posts_blocks_contact_details" USING btree ("_path");
  CREATE INDEX "posts_blocks_logo_cloud_items_order_idx" ON "posts_blocks_logo_cloud_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_logo_cloud_items_parent_id_idx" ON "posts_blocks_logo_cloud_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logo_cloud_items_image_idx" ON "posts_blocks_logo_cloud_items" USING btree ("image_id");
  CREATE INDEX "posts_blocks_logo_cloud_order_idx" ON "posts_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "posts_blocks_logo_cloud_parent_id_idx" ON "posts_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logo_cloud_path_idx" ON "posts_blocks_logo_cloud" USING btree ("_path");
  CREATE INDEX "posts_blocks_spacer_order_idx" ON "posts_blocks_spacer" USING btree ("_order");
  CREATE INDEX "posts_blocks_spacer_parent_id_idx" ON "posts_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_spacer_path_idx" ON "posts_blocks_spacer" USING btree ("_path");
  CREATE INDEX "posts_tenant_idx" ON "posts" USING btree ("tenant_id");
  CREATE INDEX "posts_website_idx" ON "posts" USING btree ("website_id");
  CREATE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_featured_image_idx" ON "posts" USING btree ("featured_image_id");
  CREATE INDEX "posts_seo_seo_og_image_idx" ON "posts" USING btree ("seo_og_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_texts_order_parent" ON "posts_texts" USING btree ("order","parent_id");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_media_id_idx" ON "posts_rels" USING btree ("media_id");
  CREATE INDEX "_posts_v_blocks_hero_links_order_idx" ON "_posts_v_blocks_hero_links" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_hero_links_parent_id_idx" ON "_posts_v_blocks_hero_links" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_hero_order_idx" ON "_posts_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_hero_parent_id_idx" ON "_posts_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_hero_path_idx" ON "_posts_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_hero_image_idx" ON "_posts_v_blocks_hero" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_rich_text_order_idx" ON "_posts_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_rich_text_parent_id_idx" ON "_posts_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_rich_text_path_idx" ON "_posts_v_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_image_text_order_idx" ON "_posts_v_blocks_image_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_image_text_parent_id_idx" ON "_posts_v_blocks_image_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_image_text_path_idx" ON "_posts_v_blocks_image_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_image_text_image_idx" ON "_posts_v_blocks_image_text" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_call_to_action_order_idx" ON "_posts_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_call_to_action_parent_id_idx" ON "_posts_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_call_to_action_path_idx" ON "_posts_v_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_card_grid_cards_order_idx" ON "_posts_v_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_card_grid_cards_parent_id_idx" ON "_posts_v_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_card_grid_order_idx" ON "_posts_v_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_card_grid_parent_id_idx" ON "_posts_v_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_card_grid_path_idx" ON "_posts_v_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_gallery_order_idx" ON "_posts_v_blocks_gallery" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_gallery_parent_id_idx" ON "_posts_v_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_gallery_path_idx" ON "_posts_v_blocks_gallery" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_faq_items_order_idx" ON "_posts_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_faq_items_parent_id_idx" ON "_posts_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_faq_order_idx" ON "_posts_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_faq_parent_id_idx" ON "_posts_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_faq_path_idx" ON "_posts_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_contact_details_order_idx" ON "_posts_v_blocks_contact_details" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_contact_details_parent_id_idx" ON "_posts_v_blocks_contact_details" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_contact_details_path_idx" ON "_posts_v_blocks_contact_details" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_logo_cloud_items_order_idx" ON "_posts_v_blocks_logo_cloud_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logo_cloud_items_parent_id_idx" ON "_posts_v_blocks_logo_cloud_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logo_cloud_items_image_idx" ON "_posts_v_blocks_logo_cloud_items" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_logo_cloud_order_idx" ON "_posts_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logo_cloud_parent_id_idx" ON "_posts_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logo_cloud_path_idx" ON "_posts_v_blocks_logo_cloud" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_spacer_order_idx" ON "_posts_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_spacer_parent_id_idx" ON "_posts_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_spacer_path_idx" ON "_posts_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_tenant_idx" ON "_posts_v" USING btree ("version_tenant_id");
  CREATE INDEX "_posts_v_version_version_website_idx" ON "_posts_v" USING btree ("version_website_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_featured_image_idx" ON "_posts_v" USING btree ("version_featured_image_id");
  CREATE INDEX "_posts_v_version_seo_version_seo_og_image_idx" ON "_posts_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_texts_order_parent" ON "_posts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_media_id_idx" ON "_posts_v_rels" USING btree ("media_id");
  CREATE INDEX "media_tenant_idx" ON "media" USING btree ("tenant_id");
  CREATE INDEX "media_website_idx" ON "media" USING btree ("website_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "navigation_items_children_order_idx" ON "navigation_items_children" USING btree ("_order");
  CREATE INDEX "navigation_items_children_parent_id_idx" ON "navigation_items_children" USING btree ("_parent_id");
  CREATE INDEX "navigation_items_children_page_idx" ON "navigation_items_children" USING btree ("page_id");
  CREATE INDEX "navigation_items_order_idx" ON "navigation_items" USING btree ("_order");
  CREATE INDEX "navigation_items_parent_id_idx" ON "navigation_items" USING btree ("_parent_id");
  CREATE INDEX "navigation_items_page_idx" ON "navigation_items" USING btree ("page_id");
  CREATE INDEX "navigation_tenant_idx" ON "navigation" USING btree ("tenant_id");
  CREATE INDEX "navigation_website_idx" ON "navigation" USING btree ("website_id");
  CREATE INDEX "navigation_updated_at_idx" ON "navigation" USING btree ("updated_at");
  CREATE INDEX "navigation_created_at_idx" ON "navigation" USING btree ("created_at");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_tenant_idx" ON "site_settings" USING btree ("tenant_id");
  CREATE INDEX "site_settings_website_idx" ON "site_settings" USING btree ("website_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_default_s_e_o_default_s_e_o_social_image_idx" ON "site_settings" USING btree ("default_s_e_o_social_image_id");
  CREATE INDEX "site_settings_updated_at_idx" ON "site_settings" USING btree ("updated_at");
  CREATE INDEX "site_settings_created_at_idx" ON "site_settings" USING btree ("created_at");
  CREATE INDEX "content_requests_comments_order_idx" ON "content_requests_comments" USING btree ("_order");
  CREATE INDEX "content_requests_comments_parent_id_idx" ON "content_requests_comments" USING btree ("_parent_id");
  CREATE INDEX "content_requests_comments_author_idx" ON "content_requests_comments" USING btree ("author_id");
  CREATE INDEX "content_requests_tenant_idx" ON "content_requests" USING btree ("tenant_id");
  CREATE INDEX "content_requests_website_idx" ON "content_requests" USING btree ("website_id");
  CREATE INDEX "content_requests_requester_idx" ON "content_requests" USING btree ("requester_id");
  CREATE INDEX "content_requests_target_page_idx" ON "content_requests" USING btree ("target_page_id");
  CREATE INDEX "content_requests_assigned_to_idx" ON "content_requests" USING btree ("assigned_to_id");
  CREATE INDEX "content_requests_resulting_page_idx" ON "content_requests" USING btree ("resulting_page_id");
  CREATE INDEX "content_requests_updated_at_idx" ON "content_requests" USING btree ("updated_at");
  CREATE INDEX "content_requests_created_at_idx" ON "content_requests" USING btree ("created_at");
  CREATE INDEX "content_requests_rels_order_idx" ON "content_requests_rels" USING btree ("order");
  CREATE INDEX "content_requests_rels_parent_idx" ON "content_requests_rels" USING btree ("parent_id");
  CREATE INDEX "content_requests_rels_path_idx" ON "content_requests_rels" USING btree ("path");
  CREATE INDEX "content_requests_rels_media_id_idx" ON "content_requests_rels" USING btree ("media_id");
  CREATE INDEX "activity_events_tenant_idx" ON "activity_events" USING btree ("tenant_id");
  CREATE INDEX "activity_events_website_idx" ON "activity_events" USING btree ("website_id");
  CREATE INDEX "activity_events_action_idx" ON "activity_events" USING btree ("action");
  CREATE INDEX "activity_events_texts_order_parent" ON "activity_events_texts" USING btree ("order","parent_id");
  CREATE INDEX "revalidation_deliveries_tenant_idx" ON "revalidation_deliveries" USING btree ("tenant_id");
  CREATE INDEX "revalidation_deliveries_website_idx" ON "revalidation_deliveries" USING btree ("website_id");
  CREATE UNIQUE INDEX "revalidation_deliveries_idempotency_key_idx" ON "revalidation_deliveries" USING btree ("idempotency_key");
  CREATE INDEX "revalidation_deliveries_updated_at_idx" ON "revalidation_deliveries" USING btree ("updated_at");
  CREATE INDEX "revalidation_deliveries_created_at_idx" ON "revalidation_deliveries" USING btree ("created_at");
  CREATE INDEX "revalidation_deliveries_texts_order_parent" ON "revalidation_deliveries_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_dgtl_tenants_id_idx" ON "payload_locked_documents_rels" USING btree ("dgtl_tenants_id");
  CREATE INDEX "payload_locked_documents_rels_cms_users_id_idx" ON "payload_locked_documents_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_locked_documents_rels_websites_id_idx" ON "payload_locked_documents_rels" USING btree ("websites_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_navigation_id_idx" ON "payload_locked_documents_rels" USING btree ("navigation_id");
  CREATE INDEX "payload_locked_documents_rels_site_settings_id_idx" ON "payload_locked_documents_rels" USING btree ("site_settings_id");
  CREATE INDEX "payload_locked_documents_rels_content_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("content_requests_id");
  CREATE INDEX "payload_locked_documents_rels_activity_events_id_idx" ON "payload_locked_documents_rels" USING btree ("activity_events_id");
  CREATE INDEX "payload_locked_documents_rels_revalidation_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("revalidation_deliveries_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_cms_users_id_idx" ON "payload_preferences_rels" USING btree ("cms_users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "dgtl_tenants" CASCADE;
  DROP TABLE "cms_users_company_roles" CASCADE;
  DROP TABLE "cms_users_tenants_roles" CASCADE;
  DROP TABLE "cms_users_tenants" CASCADE;
  DROP TABLE "cms_users_sessions" CASCADE;
  DROP TABLE "cms_users" CASCADE;
  DROP TABLE "websites" CASCADE;
  DROP TABLE "pages_blocks_hero_links" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_image_text" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_card_grid_cards" CASCADE;
  DROP TABLE "pages_blocks_card_grid" CASCADE;
  DROP TABLE "pages_blocks_gallery" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_contact_details" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_items" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud" CASCADE;
  DROP TABLE "pages_blocks_spacer" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_links" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_image_text" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_card_grid_cards" CASCADE;
  DROP TABLE "_pages_v_blocks_card_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_gallery" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_contact_details" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_items" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_pages_v_blocks_spacer" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "posts_blocks_hero_links" CASCADE;
  DROP TABLE "posts_blocks_hero" CASCADE;
  DROP TABLE "posts_blocks_rich_text" CASCADE;
  DROP TABLE "posts_blocks_image_text" CASCADE;
  DROP TABLE "posts_blocks_call_to_action" CASCADE;
  DROP TABLE "posts_blocks_card_grid_cards" CASCADE;
  DROP TABLE "posts_blocks_card_grid" CASCADE;
  DROP TABLE "posts_blocks_gallery" CASCADE;
  DROP TABLE "posts_blocks_faq_items" CASCADE;
  DROP TABLE "posts_blocks_faq" CASCADE;
  DROP TABLE "posts_blocks_contact_details" CASCADE;
  DROP TABLE "posts_blocks_logo_cloud_items" CASCADE;
  DROP TABLE "posts_blocks_logo_cloud" CASCADE;
  DROP TABLE "posts_blocks_spacer" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_texts" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v_blocks_hero_links" CASCADE;
  DROP TABLE "_posts_v_blocks_hero" CASCADE;
  DROP TABLE "_posts_v_blocks_rich_text" CASCADE;
  DROP TABLE "_posts_v_blocks_image_text" CASCADE;
  DROP TABLE "_posts_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_posts_v_blocks_card_grid_cards" CASCADE;
  DROP TABLE "_posts_v_blocks_card_grid" CASCADE;
  DROP TABLE "_posts_v_blocks_gallery" CASCADE;
  DROP TABLE "_posts_v_blocks_faq_items" CASCADE;
  DROP TABLE "_posts_v_blocks_faq" CASCADE;
  DROP TABLE "_posts_v_blocks_contact_details" CASCADE;
  DROP TABLE "_posts_v_blocks_logo_cloud_items" CASCADE;
  DROP TABLE "_posts_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_posts_v_blocks_spacer" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_texts" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "navigation_items_children" CASCADE;
  DROP TABLE "navigation_items" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "content_requests_comments" CASCADE;
  DROP TABLE "content_requests" CASCADE;
  DROP TABLE "content_requests_rels" CASCADE;
  DROP TABLE "activity_events" CASCADE;
  DROP TABLE "activity_events_texts" CASCADE;
  DROP TABLE "revalidation_deliveries" CASCADE;
  DROP TABLE "revalidation_deliveries_texts" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_dgtl_tenants_status";
  DROP TYPE "public"."enum_cms_users_company_roles";
  DROP TYPE "public"."enum_cms_users_tenants_roles";
  DROP TYPE "public"."enum_cms_users_account_type";
  DROP TYPE "public"."enum_cms_users_status";
  DROP TYPE "public"."enum_websites_status";
  DROP TYPE "public"."enum_pages_blocks_image_text_alignment";
  DROP TYPE "public"."enum_pages_blocks_spacer_size";
  DROP TYPE "public"."enum_pages_template";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_image_text_alignment";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_size";
  DROP TYPE "public"."enum__pages_v_version_template";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum_posts_blocks_image_text_alignment";
  DROP TYPE "public"."enum_posts_blocks_spacer_size";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_blocks_image_text_alignment";
  DROP TYPE "public"."enum__posts_v_blocks_spacer_size";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum_media_classification";
  DROP TYPE "public"."enum_media_scan_status";
  DROP TYPE "public"."enum_navigation_location";
  DROP TYPE "public"."enum_content_requests_priority";
  DROP TYPE "public"."enum_content_requests_status";
  DROP TYPE "public"."enum_activity_events_actor_type";
  DROP TYPE "public"."enum_activity_events_outcome";
  DROP TYPE "public"."enum_revalidation_deliveries_state";`)
}
