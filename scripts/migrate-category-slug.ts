import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import postgres from "postgres";

(async () => {
  const sql = postgres(process.env.DATABASE_URL!);
  await sql.unsafe(`
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_slug" text;
    ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "color" text;
  `);
  await sql.end();
  console.log("Migration complete: category_slug and color columns added");
})();
