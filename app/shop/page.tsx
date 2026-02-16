import { Suspense } from "react";
import { eq, asc, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductCard } from "@/components/ProductCard";
import { ShopSidebar } from "@/components/ShopSidebar";

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const VALID_CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;

interface ShopPageProps {
  searchParams: Promise<{ category?: string; sort?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const category = params.category;
  const sort = (params.sort ?? "newest") as SortOption;

  const categoryFilter =
    category &&
    category !== "all" &&
    VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number]);

  const whereClause = categoryFilter
    ? and(
        eq(products.isVisible, true),
        eq(products.category, category as (typeof VALID_CATEGORIES)[number])
      )
    : eq(products.isVisible, true);

  const orderBy =
    sort === "price-asc"
      ? asc(products.price)
      : sort === "price-desc"
        ? desc(products.price)
        : sort === "name-asc"
          ? asc(products.name)
          : sort === "name-desc"
            ? desc(products.name)
            : desc(products.id);

  const productList = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderBy);

  return (
    <div className="container mx-auto flex gap-8 px-4 py-8">
      <Suspense fallback={<ShopSidebarSkeleton />}>
        <ShopSidebar />
      </Suspense>
      <main className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold">Shop</h1>
        {productList.length === 0 ? (
          <p className="text-muted-foreground">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ShopSidebarSkeleton() {
  return (
    <aside className="w-64 shrink-0 space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </aside>
  );
}
