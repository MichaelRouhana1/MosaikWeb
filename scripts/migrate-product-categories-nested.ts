import "dotenv/config";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
    await sql`
    DO $$ BEGIN
        CREATE TYPE category_level AS ENUM ('root', 'main', 'sub');
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;
  `;
    await sql`ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS parent_id integer REFERENCES product_categories(id)`;
    await sql`ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS level category_level NOT NULL DEFAULT 'main'`;
    console.log("product_categories hierarchical columns added");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
