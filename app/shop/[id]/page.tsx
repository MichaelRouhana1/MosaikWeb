import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, inArray, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, productVariants, wishlists } from "@/db/schema";
import { ProductDetailClient } from "@/components/ProductDetailClient";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || !product.isVisible) notFound();

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, product.id));

  const categorySlug = product.categorySlug ?? "trousers";
  const similarProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.isVisible, true),
        eq(products.categorySlug, categorySlug),
        ne(products.id, productId)
      )
    )
    .limit(10);

  const similarProductIds = similarProducts.map((p) => p.id);
  const similarVariants =
    similarProductIds.length > 0
      ? await db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, similarProductIds))
      : [];

  const variantsByProductId = similarVariants.reduce<
    Record<number, typeof productVariants.$inferSelect[]>
  >((acc, v) => {
    if (!acc[v.productId]) acc[v.productId] = [];
    acc[v.productId].push(v);
    return acc;
  }, {});

  let wishlistProductIds: number[] = [];
  const { userId } = await auth();
  if (userId) {
    const userWishlist = await db
      .select({ productId: wishlists.productId })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));
    wishlistProductIds = userWishlist.map((w) => w.productId);
  }

  const inWishlist = wishlistProductIds.includes(product.id);

  return (
    <div className="pt-14">
      <Link
        href="/shop"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block px-6"
      >
        ← Back to shop
      </Link>
      <ProductDetailClient
        product={product}
        variants={variants}
        inWishlist={inWishlist}
        similarProducts={similarProducts}
        variantsByProductId={variantsByProductId}
        wishlistProductIds={wishlistProductIds}
      />
    </div>
  );
}
