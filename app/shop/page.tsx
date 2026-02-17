import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, productVariants, wishlists } from "@/db/schema";
import { ShopClient } from "@/components/ShopClient";
import { Suspense } from "react";

const VALID_CAT_SLUGS = ["trousers", "shirts", "tshirts", "hoodies", "jackets", "jeans"] as const;

interface ShopPageProps {
  searchParams: Promise<{ category?: string; cat?: string; sort?: string }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const category = params.category;
  const cat = params.cat;

  const catFilter =
    cat &&
    VALID_CAT_SLUGS.includes(cat as (typeof VALID_CAT_SLUGS)[number]);

  const whereClause = catFilter
    ? and(eq(products.isVisible, true), eq(products.categorySlug, cat as (typeof VALID_CAT_SLUGS)[number]))
    : eq(products.isVisible, true);

  const productList = await db
    .select()
    .from(products)
    .where(whereClause);

  const productIds = productList.map((p) => p.id);
  const variantsList =
    productIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds))
      : [];

  const variantsByProductId = variantsList.reduce<Record<number, typeof productVariants.$inferSelect[]>>(
    (acc, v) => {
      if (!acc[v.productId]) acc[v.productId] = [];
      acc[v.productId].push(v);
      return acc;
    },
    {}
  );

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
          products={productList}
          variantsByProductId={variantsByProductId}
          wishlistProductIds={wishlistProductIds}
        />
      </Suspense>
    </div>
  );
}
