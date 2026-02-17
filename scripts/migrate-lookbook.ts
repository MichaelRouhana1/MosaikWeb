import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS lookbook_items (
      id serial PRIMARY KEY,
      label text NOT NULL,
      image_url text NOT NULL,
      href text NOT NULL DEFAULT '/shop',
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log("lookbook_items table created successfully");

  const existing = await sql`SELECT 1 FROM lookbook_items LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO lookbook_items (label, image_url, href, sort_order)
      VALUES
        ('Everyday', '/images/everyday.png', '/shop', 0),
        ('Tailored Casual', 'https://images.pexels.com/photos/4611700/pexels-photo-4611700.jpeg?auto=compress&cs=tinysrgb&w=600&h=800&fit=crop', '/shop', 1),
        ('Minimal Street', '/images/minimal-street.png', '/shop', 2)
    `;
    console.log("Seeded 3 default lookbook items");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
