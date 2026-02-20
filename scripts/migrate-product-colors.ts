import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // 1. Create product_colors table
  await sql`
    CREATE TABLE IF NOT EXISTS product_colors (
      id serial PRIMARY KEY,
      product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name text NOT NULL,
      hex_code text,
      image_urls text[] NOT NULL DEFAULT '{}'
    )
  `;
  console.log("product_colors table created");

  // 2. Add color_id to product_variants if not exists (nullable first)
  const hasColorId = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'color_id'
  `;

  if (hasColorId.length === 0) {
    await sql`ALTER TABLE product_variants ADD COLUMN color_id integer REFERENCES product_colors(id) ON DELETE CASCADE`;
    console.log("Added color_id to product_variants");
  }

  // 3. Migrate: for each product, create product_color and assign to variants
  const hasImages = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'images'
  `;

  const products = await sql`SELECT id, images, color FROM products`;
  for (const p of products) {
    const images = hasImages.length > 0 && p.images ? (p.images as string[]) : [];
    const name = (p.color as string) || "Default";

    const existingColors = await sql`SELECT id FROM product_colors WHERE product_id = ${p.id} LIMIT 1`;
    let colorId: number;

    if (existingColors.length > 0) {
      colorId = existingColors[0].id;
      if (hasImages.length > 0 && images.length > 0) {
        await sql`UPDATE product_colors SET image_urls = ${images} WHERE id = ${colorId}`;
      }
    } else {
      const [color] = await sql`
        INSERT INTO product_colors (product_id, name, image_urls)
        VALUES (${p.id}, ${name}, ${images})
        RETURNING id
      `;
      colorId = color.id;
    }

    await sql`UPDATE product_variants SET color_id = ${colorId} WHERE product_id = ${p.id}`;
  }
  console.log("Migrated product images to product_colors");

  // 4. Set color_id NOT NULL if still nullable
  const colorIdNullable = await sql`
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'color_id'
  `;
  if (colorIdNullable[0]?.is_nullable === "YES") {
    await sql`ALTER TABLE product_variants ALTER COLUMN color_id SET NOT NULL`;
  }

  // 4. Remove sku from product_variants if exists
  const hasSku = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'product_variants' AND column_name = 'sku'
  `;
  if (hasSku.length > 0) {
    await sql`ALTER TABLE product_variants DROP COLUMN sku`;
    console.log("Removed sku from product_variants");
  }

  // 5. Remove images from products if exists
  if (hasImages.length > 0) {
    await sql`ALTER TABLE products DROP COLUMN images`;
    console.log("Removed images from products");
  }

  console.log("Migration complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
