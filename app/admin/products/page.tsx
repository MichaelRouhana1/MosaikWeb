import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import { ProductsTable } from "./ProductsTable";
import { getCategories } from "@/actions/categories";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const category = params.category;

  const categories = await getCategories();
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.slug, c.label]));

  let productList = await db
    .select()
    .from(products)
    .orderBy(desc(products.id));

  if (q) {
    productList = productList.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(q.toLowerCase())
    );
  }

  if (category && category !== "all") {
    productList = productList.filter((p) => (p.categorySlug ?? p.category) === category);
  }

  const productIds = productList.map((p) => p.id);
  const variants =
    productIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds))
      : [];

  const stockByProduct = variants.reduce<Record<number, number>>((acc, v) => {
    acc[v.productId] = (acc[v.productId] ?? 0) + v.stock;
    return acc;
  }, {});

  const stockBySizeByProduct = variants.reduce<
    Record<number, Record<string, number>>
  >((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = {};
    acc[v.productId][v.size] = v.stock;
    return acc;
  }, {});

  const productsWithStock = productList.map((p) => ({
    ...p,
    totalStock: stockByProduct[p.id] ?? 0,
    stockBySize: stockBySizeByProduct[p.id] ?? {},
    categoryLabel: categoryLabels[p.categorySlug ?? ""] ?? p.categorySlug ?? p.category ?? "—",
    colorLabel: (p as { color?: string | null }).color ?? deriveColor(p.name, p.description),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="px-6 py-2.5 bg-foreground text-background text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Add Product
        </Link>
      </div>

      <Suspense fallback={<div className="animate-pulse h-64 bg-muted rounded" />}>
        <ProductsTable
          products={productsWithStock}
          initialQuery={q}
          initialCategory={category}
          categories={categories}
        />
      </Suspense>
    </div>
  );
}

function deriveColor(name: string, description: string | null): string {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  const colors = [
    "black",
    "white",
    "indigo",
    "charcoal",
    "camel",
    "navy",
    "grey",
    "gray",
    "blue",
    "beige",
  ];
  for (const c of colors) {
    if (text.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  return "—";
}
