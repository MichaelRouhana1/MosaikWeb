CREATE TYPE "public"."category_level" AS ENUM('root', 'main', 'sub');--> statement-breakpoint
CREATE TYPE "public"."promo_discount_type" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');--> statement-breakpoint
CREATE TYPE "public"."store_type" AS ENUM('streetwear', 'formal', 'both');--> statement-breakpoint
CREATE TABLE "home_video" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_url" text NOT NULL,
	"caption" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"store_type" "store_type" DEFAULT 'streetwear' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookbook_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"image_url" text NOT NULL,
	"href" text DEFAULT '/shop' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"store_type" "store_type" DEFAULT 'streetwear' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"image" text,
	"show_on_home" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"parent_id" integer,
	"level" "category_level" DEFAULT 'main' NOT NULL,
	"store_type" "store_type" DEFAULT 'streetwear' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_colors" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"hex_code" text,
	"image_urls" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" "promo_discount_type" NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_uses" integer,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "section_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_key" text NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	CONSTRAINT "section_settings_section_key_unique" UNIQUE("section_key")
);
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "phone_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "address_line1" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "city" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_images" ADD COLUMN "store_type" "store_type" DEFAULT 'streetwear' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "subtotal_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code_id" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "color_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_starts_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sale_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_sale_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_type" "store_type" DEFAULT 'streetwear' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_categories_store_type_idx" ON "product_categories" USING btree ("store_type");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_color_id_product_colors_id_fk" FOREIGN KEY ("color_id") REFERENCES "public"."product_colors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hero_images_store_type_idx" ON "hero_images" USING btree ("store_type");--> statement-breakpoint
CREATE INDEX "products_store_type_idx" ON "products" USING btree ("store_type");--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "sku";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "images";