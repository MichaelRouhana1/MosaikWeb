import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS hero_images (
      id serial PRIMARY KEY,
      image_url text NOT NULL,
      alt_text text,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log("hero_images table created successfully");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
