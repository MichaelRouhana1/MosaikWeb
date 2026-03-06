import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, productVariants, productColors, wishlists } from "@/db/schema";
import { ShopClient } from "@/components/ShopClient";
import { getValidCategorySlugs, getStoreCategorySlugs, getStoreCategories } from "@/actions/categories";
import { Suspense } from "react";
import { notFound } from "next/navigation";

interface ShopPageProps {
  params: Promise<{ storeType: string }>;
  searchParams: Promise<{ category?: string; cat?: string; sort?: string }>;
}

import type { Metadata } from "next";

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { storeType } = await params;
  const title = storeType === "streetwear" ? "Streetwear Shop" : storeType === "formal" ? "Formal Shop" : "Shop";
  return {
    title: `MOSAIK | ${title}`,
  };
}

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const { storeType } = await params;
  const search = await searchParams;
  const cat = search.cat;

  const validSlugs = await getValidCategorySlugs();
  const storeSlugs = await getStoreCategorySlugs(storeType);

  if (storeSlugs.length === 0 && (storeType === "streetwear" || storeType === "formal")) {
    // Wait, if no categories seeded yet, let's at least allow the page to load, but we filter if seeded.
    // Also valid route check
  } else if (storeType !== "streetwear" && storeType !== "formal") {
    notFound();
  }

  const catFilter = cat && validSlugs.includes(cat) && storeSlugs.includes(cat);

  const baseFilters = [eq(products.isVisible, true)];
  baseFilters.push(inArray(products.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]));

  if (catFilter && cat) {
    baseFilters.push(eq(products.categorySlug, cat));
  }

  const whereClause = and(...baseFilters);

  const productList = await db
    .select()
    .from(products)
    .where(whereClause);

  const productIds = productList.map((p) => p.id);
  const [variantsList, colorsList] =
    productIds.length > 0
      ? await Promise.all([
        db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
        db.select().from(productColors).where(inArray(productColors.productId, productIds)),
      ])
      : [[], []];

  const colorsByProductId = colorsList.reduce<Record<number, typeof productColors.$inferSelect[]>>(
    (acc, c) => {
      if (!acc[c.productId]) acc[c.productId] = [];
      acc[c.productId].push(c);
      return acc;
    },
    {}
  );

  const firstImageByProductId: Record<number, string> = {};
  for (const c of colorsList) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  const productsWithImages = productList.map((p) => ({
    ...p,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [],
  }));

  const variantsByProductId = variantsList.reduce<Record<number, typeof productVariants.$inferSelect[]>>(
    (acc, v) => {
      if (!acc[v.productId]) acc[v.productId] = [];
      acc[v.productId].push(v);
      return acc;
    },
    {}
  );

  // const categories = await getCategories(); // Not used
  const storeCategories = await getStoreCategories(storeType);
  const categoryLabel = catFilter && cat ? storeCategories.find((c) => c.slug === cat)?.label ?? null : null;

  let wishlistProductIds: number[] = [];
  const { userId } = await auth();
  if (userId) {
    const userWishlist = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    wishlistProductIds = userWishlist.map((w) => w.productId);
  }

  return (
    <div className="pt-14">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 border-4 border-muted border-t-foreground animate-spin rounded-full" />
          </div>
        }
      >
        <ShopClient
          products={productsWithImages}
          variantsByProductId={variantsByProductId}
          colorsByProductId={colorsByProductId}
          wishlistProductIds={wishlistProductIds}
          categoryLabel={categoryLabel}
          storeCategories={storeCategories}
        />
      </Suspense>
    </div>
  );
}
