import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

// Use direct connection (5432) - pooler (6543) can hang on GIN/index creation
const url = process.env.DATABASE_URL!.replace(":6543/", ":5432/");
const sql = postgres(url);

async function main() {
  const hasColumn = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'search_vector'
    LIMIT 1
  `;
  if (hasColumn.length > 0) {
    console.log("search_vector column already exists, skipping");
    process.exit(0);
    return;
  }

  await sql`
    ALTER TABLE products
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED
  `;
  console.log("Added search_vector column");

  await sql`CREATE INDEX products_search_vector_idx ON products USING GIN (search_vector)`;
  console.log("Created products_search_vector_idx");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
