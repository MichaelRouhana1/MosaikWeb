-- Create promo_discount_type enum
DO $$ BEGIN
  CREATE TYPE "promo_discount_type" AS ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create promo_codes table
CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "discount_type" "promo_discount_type" NOT NULL,
  "discount_value" numeric(10, 2) NOT NULL,
  "min_order_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
  "max_uses" integer,
  "current_uses" integer DEFAULT 0 NOT NULL,
  "expires_at" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add new columns to orders (for existing DBs without them)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotal_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promo_code_id" integer REFERENCES "promo_codes"("id");

-- Backfill existing orders: set subtotal_amount = total_amount where they might be null/0
UPDATE "orders" SET "subtotal_amount" = "total_amount" WHERE "subtotal_amount" = 0 OR "subtotal_amount" IS NULL;
