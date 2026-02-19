import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

const DEFAULT_CATEGORIES = [
  { slug: "trousers", label: "Trousers", image: "/images/trousers.png", show_on_home: true, sort_order: 0 },
  { slug: "shirts", label: "Shirts", image: "/images/shirts.png", show_on_home: true, sort_order: 1 },
  { slug: "tshirts", label: "T-Shirts", image: "/images/tshirts.png", show_on_home: true, sort_order: 2 },
  { slug: "hoodies", label: "Hoodies", image: "/images/hoodies.png", show_on_home: true, sort_order: 3 },
  { slug: "jackets", label: "Jackets & Coats", image: "/images/A9C0AFA5-B129-4D89-8EE6-EC5C28086A2E.JPG", show_on_home: true, sort_order: 4 },
  { slug: "jeans", label: "Jeans", image: "/images/jeans.png", show_on_home: true, sort_order: 5 },
];

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS product_categories (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      label text NOT NULL,
      image text,
      show_on_home boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log("product_categories table created successfully");

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await sql`SELECT 1 FROM product_categories WHERE slug = ${cat.slug} LIMIT 1`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO product_categories (slug, label, image, show_on_home, sort_order)
        VALUES (${cat.slug}, ${cat.label}, ${cat.image}, ${cat.show_on_home}, ${cat.sort_order})
      `;
      console.log(`Seeded category: ${cat.label}`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
