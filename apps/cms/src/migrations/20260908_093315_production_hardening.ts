import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_template" ADD VALUE 'service';
  ALTER TYPE "public"."enum__pages_v_version_template" ADD VALUE 'service';
  CREATE TABLE "pages_blocks_service_index" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_company_overview_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "pages_blocks_company_overview_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "pages_blocks_company_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'who-we-are',
  	"kicker" varchar,
  	"heading" varchar,
  	"lead" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-attitude',
  	"kicker" varchar,
  	"heading" varchar,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_team_showcase_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"role" varchar,
  	"description" varchar,
  	"portrait_position" varchar DEFAULT '50% 50%',
  	"profile_position" varchar DEFAULT '50% 50%'
  );
  
  CREATE TABLE "pages_blocks_team_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'team',
  	"kicker" varchar,
  	"heading" varchar,
  	"instruction" varchar,
  	"portrait_image_id" integer,
  	"profile_image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_identity_field_alphabets" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"characters" varchar
  );
  
  CREATE TABLE "pages_blocks_identity_field" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"wordmark" varchar,
  	"aria_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_service_detail_sections_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "pages_blocks_service_detail_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "pages_blocks_service_detail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"label" varchar,
  	"card_headline" varchar,
  	"preview" varchar,
  	"summary" varchar,
  	"detail_description" varchar,
  	"tagline" varchar,
  	"accent" varchar,
  	"image_id" integer,
  	"image_position" varchar DEFAULT '50% 50%',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_service_index" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_company_overview_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_company_overview_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_company_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'who-we-are',
  	"kicker" varchar,
  	"heading" varchar,
  	"lead" varchar,
  	"link_label" varchar,
  	"link_url" varchar,
  	"link_new_tab" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_statement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-attitude',
  	"kicker" varchar,
  	"heading" varchar,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_showcase_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"role" varchar,
  	"description" varchar,
  	"portrait_position" varchar DEFAULT '50% 50%',
  	"profile_position" varchar DEFAULT '50% 50%',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'team',
  	"kicker" varchar,
  	"heading" varchar,
  	"instruction" varchar,
  	"portrait_image_id" integer,
  	"profile_image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_identity_field_alphabets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"characters" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_identity_field" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"wordmark" varchar,
  	"aria_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_service_detail_sections_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_service_detail_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_service_detail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"label" varchar,
  	"card_headline" varchar,
  	"preview" varchar,
  	"summary" varchar,
  	"detail_description" varchar,
  	"tagline" varchar,
  	"accent" varchar,
  	"image_id" integer,
  	"image_position" varchar DEFAULT '50% 50%',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "media" ALTER COLUMN "scan_status" SET DEFAULT 'pending';
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "active_service_link_label" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "card_link_label" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "scroll_prompt" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "desktop_services_label" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "mobile_services_label" varchar;
  ALTER TABLE "pages_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "active_service_link_label" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "card_link_label" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "scroll_prompt" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "desktop_services_label" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "mobile_services_label" varchar;
  ALTER TABLE "_pages_v_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "active_service_link_label" varchar;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "card_link_label" varchar;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "scroll_prompt" varchar;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "desktop_services_label" varchar;
  ALTER TABLE "posts_blocks_hero" ADD COLUMN "mobile_services_label" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "video_id" integer;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "active_service_link_label" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "card_link_label" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "scroll_prompt" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "desktop_services_label" varchar;
  ALTER TABLE "_posts_v_blocks_hero" ADD COLUMN "mobile_services_label" varchar;
  ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_location_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_footer_eyebrow" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_footer_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_footer_description" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_legal_location" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brand_content_back_to_top_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_home_kicker" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_service_kicker" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_service_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_service_text" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_address_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_name_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_email_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_company_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_phone_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_message_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_submit_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_sending_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_success_message" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "enquiry_content_error_message" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_content_breadcrumb_label" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_content_reel_kicker" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_content_reel_heading" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_content_reel_instruction" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "service_content_back_label" varchar;
  ALTER TABLE "pages_blocks_service_index" ADD CONSTRAINT "pages_blocks_service_index_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_company_overview_paragraphs" ADD CONSTRAINT "pages_blocks_company_overview_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_company_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_company_overview_capabilities" ADD CONSTRAINT "pages_blocks_company_overview_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_company_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_company_overview" ADD CONSTRAINT "pages_blocks_company_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_statement" ADD CONSTRAINT "pages_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_showcase_members" ADD CONSTRAINT "pages_blocks_team_showcase_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_showcase" ADD CONSTRAINT "pages_blocks_team_showcase_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_showcase" ADD CONSTRAINT "pages_blocks_team_showcase_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_showcase" ADD CONSTRAINT "pages_blocks_team_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_identity_field_alphabets" ADD CONSTRAINT "pages_blocks_identity_field_alphabets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_identity_field"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_identity_field" ADD CONSTRAINT "pages_blocks_identity_field_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_service_detail_sections_items" ADD CONSTRAINT "pages_blocks_service_detail_sections_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_service_detail_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_service_detail_sections" ADD CONSTRAINT "pages_blocks_service_detail_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_service_detail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_service_detail" ADD CONSTRAINT "pages_blocks_service_detail_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_service_detail" ADD CONSTRAINT "pages_blocks_service_detail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_service_index" ADD CONSTRAINT "_pages_v_blocks_service_index_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_company_overview_paragraphs" ADD CONSTRAINT "_pages_v_blocks_company_overview_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_company_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_company_overview_capabilities" ADD CONSTRAINT "_pages_v_blocks_company_overview_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_company_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_company_overview" ADD CONSTRAINT "_pages_v_blocks_company_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_statement" ADD CONSTRAINT "_pages_v_blocks_statement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" ADD CONSTRAINT "_pages_v_blocks_team_showcase_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_showcase" ADD CONSTRAINT "_pages_v_blocks_team_showcase_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_showcase" ADD CONSTRAINT "_pages_v_blocks_team_showcase_profile_image_id_media_id_fk" FOREIGN KEY ("profile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_showcase" ADD CONSTRAINT "_pages_v_blocks_team_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_identity_field_alphabets" ADD CONSTRAINT "_pages_v_blocks_identity_field_alphabets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_identity_field"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_identity_field" ADD CONSTRAINT "_pages_v_blocks_identity_field_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_service_detail_sections_items" ADD CONSTRAINT "_pages_v_blocks_service_detail_sections_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_service_detail_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_service_detail_sections" ADD CONSTRAINT "_pages_v_blocks_service_detail_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_service_detail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_service_detail" ADD CONSTRAINT "_pages_v_blocks_service_detail_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_service_detail" ADD CONSTRAINT "_pages_v_blocks_service_detail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_service_index_order_idx" ON "pages_blocks_service_index" USING btree ("_order");
  CREATE INDEX "pages_blocks_service_index_parent_id_idx" ON "pages_blocks_service_index" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_service_index_path_idx" ON "pages_blocks_service_index" USING btree ("_path");
  CREATE INDEX "pages_blocks_company_overview_paragraphs_order_idx" ON "pages_blocks_company_overview_paragraphs" USING btree ("_order");
  CREATE INDEX "pages_blocks_company_overview_paragraphs_parent_id_idx" ON "pages_blocks_company_overview_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_company_overview_capabilities_order_idx" ON "pages_blocks_company_overview_capabilities" USING btree ("_order");
  CREATE INDEX "pages_blocks_company_overview_capabilities_parent_id_idx" ON "pages_blocks_company_overview_capabilities" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_company_overview_order_idx" ON "pages_blocks_company_overview" USING btree ("_order");
  CREATE INDEX "pages_blocks_company_overview_parent_id_idx" ON "pages_blocks_company_overview" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_company_overview_path_idx" ON "pages_blocks_company_overview" USING btree ("_path");
  CREATE INDEX "pages_blocks_statement_order_idx" ON "pages_blocks_statement" USING btree ("_order");
  CREATE INDEX "pages_blocks_statement_parent_id_idx" ON "pages_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_statement_path_idx" ON "pages_blocks_statement" USING btree ("_path");
  CREATE INDEX "pages_blocks_team_showcase_members_order_idx" ON "pages_blocks_team_showcase_members" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_showcase_members_parent_id_idx" ON "pages_blocks_team_showcase_members" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_showcase_order_idx" ON "pages_blocks_team_showcase" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_showcase_parent_id_idx" ON "pages_blocks_team_showcase" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_showcase_path_idx" ON "pages_blocks_team_showcase" USING btree ("_path");
  CREATE INDEX "pages_blocks_team_showcase_portrait_image_idx" ON "pages_blocks_team_showcase" USING btree ("portrait_image_id");
  CREATE INDEX "pages_blocks_team_showcase_profile_image_idx" ON "pages_blocks_team_showcase" USING btree ("profile_image_id");
  CREATE INDEX "pages_blocks_identity_field_alphabets_order_idx" ON "pages_blocks_identity_field_alphabets" USING btree ("_order");
  CREATE INDEX "pages_blocks_identity_field_alphabets_parent_id_idx" ON "pages_blocks_identity_field_alphabets" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_identity_field_order_idx" ON "pages_blocks_identity_field" USING btree ("_order");
  CREATE INDEX "pages_blocks_identity_field_parent_id_idx" ON "pages_blocks_identity_field" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_identity_field_path_idx" ON "pages_blocks_identity_field" USING btree ("_path");
  CREATE INDEX "pages_blocks_service_detail_sections_items_order_idx" ON "pages_blocks_service_detail_sections_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_service_detail_sections_items_parent_id_idx" ON "pages_blocks_service_detail_sections_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_service_detail_sections_order_idx" ON "pages_blocks_service_detail_sections" USING btree ("_order");
  CREATE INDEX "pages_blocks_service_detail_sections_parent_id_idx" ON "pages_blocks_service_detail_sections" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_service_detail_order_idx" ON "pages_blocks_service_detail" USING btree ("_order");
  CREATE INDEX "pages_blocks_service_detail_parent_id_idx" ON "pages_blocks_service_detail" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_service_detail_path_idx" ON "pages_blocks_service_detail" USING btree ("_path");
  CREATE INDEX "pages_blocks_service_detail_image_idx" ON "pages_blocks_service_detail" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_service_index_order_idx" ON "_pages_v_blocks_service_index" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_service_index_parent_id_idx" ON "_pages_v_blocks_service_index" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_service_index_path_idx" ON "_pages_v_blocks_service_index" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_company_overview_paragraphs_order_idx" ON "_pages_v_blocks_company_overview_paragraphs" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_company_overview_paragraphs_parent_id_idx" ON "_pages_v_blocks_company_overview_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_company_overview_capabilities_order_idx" ON "_pages_v_blocks_company_overview_capabilities" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_company_overview_capabilities_parent_id_idx" ON "_pages_v_blocks_company_overview_capabilities" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_company_overview_order_idx" ON "_pages_v_blocks_company_overview" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_company_overview_parent_id_idx" ON "_pages_v_blocks_company_overview" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_company_overview_path_idx" ON "_pages_v_blocks_company_overview" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_statement_order_idx" ON "_pages_v_blocks_statement" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_statement_parent_id_idx" ON "_pages_v_blocks_statement" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_statement_path_idx" ON "_pages_v_blocks_statement" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_team_showcase_members_order_idx" ON "_pages_v_blocks_team_showcase_members" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_showcase_members_parent_id_idx" ON "_pages_v_blocks_team_showcase_members" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_showcase_order_idx" ON "_pages_v_blocks_team_showcase" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_showcase_parent_id_idx" ON "_pages_v_blocks_team_showcase" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_showcase_path_idx" ON "_pages_v_blocks_team_showcase" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_team_showcase_portrait_image_idx" ON "_pages_v_blocks_team_showcase" USING btree ("portrait_image_id");
  CREATE INDEX "_pages_v_blocks_team_showcase_profile_image_idx" ON "_pages_v_blocks_team_showcase" USING btree ("profile_image_id");
  CREATE INDEX "_pages_v_blocks_identity_field_alphabets_order_idx" ON "_pages_v_blocks_identity_field_alphabets" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_identity_field_alphabets_parent_id_idx" ON "_pages_v_blocks_identity_field_alphabets" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_identity_field_order_idx" ON "_pages_v_blocks_identity_field" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_identity_field_parent_id_idx" ON "_pages_v_blocks_identity_field" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_identity_field_path_idx" ON "_pages_v_blocks_identity_field" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_service_detail_sections_items_order_idx" ON "_pages_v_blocks_service_detail_sections_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_service_detail_sections_items_parent_id_idx" ON "_pages_v_blocks_service_detail_sections_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_service_detail_sections_order_idx" ON "_pages_v_blocks_service_detail_sections" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_service_detail_sections_parent_id_idx" ON "_pages_v_blocks_service_detail_sections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_service_detail_order_idx" ON "_pages_v_blocks_service_detail" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_service_detail_parent_id_idx" ON "_pages_v_blocks_service_detail" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_service_detail_path_idx" ON "_pages_v_blocks_service_detail" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_service_detail_image_idx" ON "_pages_v_blocks_service_detail" USING btree ("image_id");
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_hero" ADD CONSTRAINT "posts_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_hero" ADD CONSTRAINT "_posts_v_blocks_hero_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_video_idx" ON "pages_blocks_hero" USING btree ("video_id");
  CREATE INDEX "pages_rels_pages_id_idx" ON "pages_rels" USING btree ("pages_id");
  CREATE INDEX "_pages_v_blocks_hero_video_idx" ON "_pages_v_blocks_hero" USING btree ("video_id");
  CREATE INDEX "_pages_v_rels_pages_id_idx" ON "_pages_v_rels" USING btree ("pages_id");
  CREATE INDEX "posts_blocks_hero_video_idx" ON "posts_blocks_hero" USING btree ("video_id");
  CREATE INDEX "_posts_v_blocks_hero_video_idx" ON "_posts_v_blocks_hero" USING btree ("video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_service_index" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_company_overview_paragraphs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_company_overview_capabilities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_company_overview" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_team_showcase_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_team_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_identity_field_alphabets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_identity_field" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_service_detail_sections_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_service_detail_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_service_detail" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_service_index" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_company_overview_paragraphs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_company_overview_capabilities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_company_overview" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_statement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_team_showcase_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_team_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_identity_field_alphabets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_identity_field" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_service_detail_sections_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_service_detail_sections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_service_detail" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_service_index" CASCADE;
  DROP TABLE "pages_blocks_company_overview_paragraphs" CASCADE;
  DROP TABLE "pages_blocks_company_overview_capabilities" CASCADE;
  DROP TABLE "pages_blocks_company_overview" CASCADE;
  DROP TABLE "pages_blocks_statement" CASCADE;
  DROP TABLE "pages_blocks_team_showcase_members" CASCADE;
  DROP TABLE "pages_blocks_team_showcase" CASCADE;
  DROP TABLE "pages_blocks_identity_field_alphabets" CASCADE;
  DROP TABLE "pages_blocks_identity_field" CASCADE;
  DROP TABLE "pages_blocks_service_detail_sections_items" CASCADE;
  DROP TABLE "pages_blocks_service_detail_sections" CASCADE;
  DROP TABLE "pages_blocks_service_detail" CASCADE;
  DROP TABLE "_pages_v_blocks_service_index" CASCADE;
  DROP TABLE "_pages_v_blocks_company_overview_paragraphs" CASCADE;
  DROP TABLE "_pages_v_blocks_company_overview_capabilities" CASCADE;
  DROP TABLE "_pages_v_blocks_company_overview" CASCADE;
  DROP TABLE "_pages_v_blocks_statement" CASCADE;
  DROP TABLE "_pages_v_blocks_team_showcase_members" CASCADE;
  DROP TABLE "_pages_v_blocks_team_showcase" CASCADE;
  DROP TABLE "_pages_v_blocks_identity_field_alphabets" CASCADE;
  DROP TABLE "_pages_v_blocks_identity_field" CASCADE;
  DROP TABLE "_pages_v_blocks_service_detail_sections_items" CASCADE;
  DROP TABLE "_pages_v_blocks_service_detail_sections" CASCADE;
  DROP TABLE "_pages_v_blocks_service_detail" CASCADE;
  ALTER TABLE "pages_blocks_hero" DROP CONSTRAINT "pages_blocks_hero_video_id_media_id_fk";
  
  ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_pages_fk";
  
  ALTER TABLE "_pages_v_blocks_hero" DROP CONSTRAINT "_pages_v_blocks_hero_video_id_media_id_fk";
  
  ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_pages_fk";
  
  ALTER TABLE "posts_blocks_hero" DROP CONSTRAINT "posts_blocks_hero_video_id_media_id_fk";
  
  ALTER TABLE "_posts_v_blocks_hero" DROP CONSTRAINT "_posts_v_blocks_hero_video_id_media_id_fk";
  
  ALTER TABLE "pages" ALTER COLUMN "template" SET DATA TYPE text;
  ALTER TABLE "pages" ALTER COLUMN "template" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum_pages_template";
  CREATE TYPE "public"."enum_pages_template" AS ENUM('standard', 'landing', 'contact');
  ALTER TABLE "pages" ALTER COLUMN "template" SET DEFAULT 'standard'::"public"."enum_pages_template";
  ALTER TABLE "pages" ALTER COLUMN "template" SET DATA TYPE "public"."enum_pages_template" USING "template"::"public"."enum_pages_template";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_template" SET DATA TYPE text;
  ALTER TABLE "_pages_v" ALTER COLUMN "version_template" SET DEFAULT 'standard'::text;
  DROP TYPE "public"."enum__pages_v_version_template";
  CREATE TYPE "public"."enum__pages_v_version_template" AS ENUM('standard', 'landing', 'contact');
  ALTER TABLE "_pages_v" ALTER COLUMN "version_template" SET DEFAULT 'standard'::"public"."enum__pages_v_version_template";
  ALTER TABLE "_pages_v" ALTER COLUMN "version_template" SET DATA TYPE "public"."enum__pages_v_version_template" USING "version_template"::"public"."enum__pages_v_version_template";
  DROP INDEX "pages_blocks_hero_video_idx";
  DROP INDEX "pages_rels_pages_id_idx";
  DROP INDEX "_pages_v_blocks_hero_video_idx";
  DROP INDEX "_pages_v_rels_pages_id_idx";
  DROP INDEX "posts_blocks_hero_video_idx";
  DROP INDEX "_posts_v_blocks_hero_video_idx";
  ALTER TABLE "media" ALTER COLUMN "scan_status" SET DEFAULT 'clean';
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "active_service_link_label";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "card_link_label";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "scroll_prompt";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "desktop_services_label";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "mobile_services_label";
  ALTER TABLE "pages_rels" DROP COLUMN "pages_id";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "active_service_link_label";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "card_link_label";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "scroll_prompt";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "desktop_services_label";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "mobile_services_label";
  ALTER TABLE "_pages_v_rels" DROP COLUMN "pages_id";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "active_service_link_label";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "card_link_label";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "scroll_prompt";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "desktop_services_label";
  ALTER TABLE "posts_blocks_hero" DROP COLUMN "mobile_services_label";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "video_id";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "active_service_link_label";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "card_link_label";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "scroll_prompt";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "desktop_services_label";
  ALTER TABLE "_posts_v_blocks_hero" DROP COLUMN "mobile_services_label";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_location_label";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_footer_eyebrow";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_footer_heading";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_footer_description";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_legal_location";
  ALTER TABLE "site_settings" DROP COLUMN "brand_content_back_to_top_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_home_kicker";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_service_kicker";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_service_heading";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_service_text";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_address_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_name_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_email_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_company_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_phone_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_message_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_submit_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_sending_label";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_success_message";
  ALTER TABLE "site_settings" DROP COLUMN "enquiry_content_error_message";
  ALTER TABLE "site_settings" DROP COLUMN "service_content_breadcrumb_label";
  ALTER TABLE "site_settings" DROP COLUMN "service_content_reel_kicker";
  ALTER TABLE "site_settings" DROP COLUMN "service_content_reel_heading";
  ALTER TABLE "site_settings" DROP COLUMN "service_content_reel_instruction";
  ALTER TABLE "site_settings" DROP COLUMN "service_content_back_label";
  `)
}
