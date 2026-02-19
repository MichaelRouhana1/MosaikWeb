import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS section_settings (
      id serial PRIMARY KEY,
      section_key text NOT NULL UNIQUE,
      is_visible boolean NOT NULL DEFAULT true
    )
  `;
  console.log("section_settings table created successfully");

  const existing = await sql`SELECT 1 FROM section_settings WHERE section_key = 'lookbook' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO section_settings (section_key, is_visible)
      VALUES ('lookbook', true)
    `;
    console.log("Seeded lookbook section setting");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
