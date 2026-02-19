import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS sale_price decimal(10, 2)
  `;
  console.log("sale_price column added to products table");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
