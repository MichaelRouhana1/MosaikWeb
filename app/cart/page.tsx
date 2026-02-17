import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { wishlists, products, productVariants } from "@/db/schema";
import { CartClient } from "@/components/CartClient";

export default async function CartPage() {
  const { userId } = await auth();

  let wishlistProducts: typeof products.$inferSelect[] = [];
  let wishlistProductIds: number[] = [];

  if (userId) {
    const userWishlist = await db
      .select({
        productId: wishlists.productId,
        product: products,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.userId, userId))
      .orderBy(desc(wishlists.createdAt));

    wishlistProducts = userWishlist.map((w) => w.product);
    wishlistProductIds = wishlistProducts.map((p) => p.id);
  }

  const variantsByProductId: Record<number, typeof productVariants.$inferSelect[]> = {};
  if (wishlistProductIds.length > 0) {
    const variants = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, wishlistProductIds));
    for (const v of variants) {
      if (!variantsByProductId[v.productId]) variantsByProductId[v.productId] = [];
      variantsByProductId[v.productId].push(v);
    }
  }

  return (
    <div className="pt-14">
      <CartClient
        wishlistProducts={wishlistProducts}
        wishlistProductIds={wishlistProductIds}
        variantsByProductId={variantsByProductId}
      />
    </div>
  );
}
