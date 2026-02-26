require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");

(async () => {
  const sql = postgres(process.env.DATABASE_URL);
  try {
    await sql.unsafe(`
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sale_starts_at" timestamp;
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sale_ends_at" timestamp;
      ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_sale_active" boolean DEFAULT true NOT NULL;
    `);
    console.log("Migration complete: sale columns added to products");
  } finally {
    await sql.end();
  }
})();
