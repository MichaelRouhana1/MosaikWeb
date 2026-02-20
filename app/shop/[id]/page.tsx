import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and, inArray, ne } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { products, productVariants, productColors, wishlists } from "@/db/schema";
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

  const [variants, colors] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db.select().from(productColors).where(eq(productColors.productId, product.id)),
  ]);

  const firstColorImages = colors[0]?.imageUrls ?? [];
  const productWithImages = { ...product, images: firstColorImages };

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
  const [similarVariants, similarColors] =
    similarProductIds.length > 0
      ? await Promise.all([
          db.select().from(productVariants).where(inArray(productVariants.productId, similarProductIds)),
          db.select().from(productColors).where(inArray(productColors.productId, similarProductIds)),
        ])
      : [[], []];

  const similarFirstImageByProductId: Record<number, string> = {};
  for (const c of similarColors) {
    if (!similarFirstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      similarFirstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  const similarProductsWithImages = similarProducts.map((p) => ({
    ...p,
    images: similarFirstImageByProductId[p.id] ? [similarFirstImageByProductId[p.id]] : [],
  }));

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
        product={productWithImages}
        variants={variants}
        colors={colors}
        inWishlist={inWishlist}
        similarProducts={similarProductsWithImages}
        variantsByProductId={variantsByProductId}
        wishlistProductIds={wishlistProductIds}
      />
    </div>
  );
}
