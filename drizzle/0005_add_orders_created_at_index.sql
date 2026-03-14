-- Add index on orders.created_at for Admin Dashboard statistics queries
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");
