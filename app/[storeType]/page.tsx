import Image from "next/image";
import Link from "next/link";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { products, productColors } from "@/db/schema";
import { getHeroImages } from "@/actions/hero";
import { getHomeVideo } from "@/actions/video";
import { getLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { getCategoriesForHome, getStoreCategorySlugs } from "@/actions/categories";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import { notFound } from "next/navigation";
import { HeroCarousel } from "@/components/HeroCarousel";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HeroFallback } from "@/components/storefront/HeroFallback";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { EditorialPromotion } from "@/components/storefront/EditorialPromotion";
import { LookbookSection } from "@/components/storefront/LookbookSection";
import { ProductDiscovery } from "@/components/storefront/ProductDiscovery";
import { SiteFooter } from "@/components/storefront/SiteFooter";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ storeType: string }> }): Promise<Metadata> {
  const { storeType } = await params;
  const isStreetwear = storeType === "streetwear";
  const title = isStreetwear ? "Streetwear Essentials" : storeType === "formal" ? "Formal Tailoring" : "Shop";
  const description = isStreetwear
    ? "Discover our latest streetwear collection featuring modern silhouettes, bold graphics, and premium everyday essentials."
    : storeType === "formal"
      ? "Elevate your style with our formal tailoring collection. Bespoke suits, crisp shirts, and refined accessories for every occasion."
      : "Shop our exclusive MOSAIK collections.";

  return {
    title: `MOSAIK | ${title}`,
    description,
    openGraph: {
      title: `MOSAIK | ${title}`,
      description,
      type: "website",
      siteName: "MOSAIK",
    },
    twitter: {
      card: "summary_large_image",
      title: `MOSAIK | ${title}`,
      description,
    }
  };
}

const PEXELS = (id: number, w = 800, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

export default async function HomePage({ params }: { params: Promise<{ storeType: string }> }) {
  const { storeType } = await params;
  if (storeType !== "streetwear" && storeType !== "formal") return notFound();

  const storeSlugs = await getStoreCategorySlugs(storeType);

  const [productList, heroImages, homeVideo, lookbookItems, lookbookSectionVisible, homeCategories] =
    await Promise.all([
      db
        .select()
        .from(products)
        .where(and(eq(products.isVisible, true), eq(products.storeType, storeType as "streetwear" | "formal")))
        .orderBy(desc(products.id))
        .limit(8),
      getHeroImages(storeType),
      getHomeVideo(storeType),
      getLookbookItems(storeType),
      getLookbookSectionVisible(),
      getCategoriesForHome(storeType),
    ]);

  const productIds = productList.map((p) => p.id);
  const colorsList =
    productIds.length > 0
      ? await db
        .select()
        .from(productColors)
        .where(inArray(productColors.productId, productIds))
      : [];


  const firstImageByProductId: Record<number, string> = {};
  for (const c of colorsList) {
    if (!firstImageByProductId[c.productId] && c.imageUrls?.[0]) {
      firstImageByProductId[c.productId] = c.imageUrls[0];
    }
  }
  const discoverProducts = productList.map((p) => {
    const imageUrls = firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [];
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: typeof p.price === "string" ? p.price : String(p.price),
      displayPrice: getProductDisplayPrice(p),
      onSale: isProductOnSale(p),
      percentOff: getProductDiscountPercent(p),
      storeType: p.storeType,
      images: imageUrls,
    };
  });

  return (
    <div className="pt-14">
      {/* Hero */}
      {heroImages.length > 0 ? (
        <HeroCarousel images={heroImages} />
      ) : (
        <HeroFallback storeType={storeType} fallbackImage={PEXELS(3748221, 1920, 1080)} />
      )}

      {/* Category Grid */}
      <CategoryGrid categories={homeCategories} storeSlugs={storeSlugs} storeType={storeType} />

      {/* Editorial Promotion */}
      <EditorialPromotion videoUrl={homeVideo?.videoUrl ?? undefined} />

      {/* Lookbook */}
      {lookbookSectionVisible && <LookbookSection items={lookbookItems} />}

      {/* Product Discovery */}
      <ProductDiscovery products={discoverProducts} currentStoreType={storeType} fallbackImage={PEXELS(708440, 440, 660)} />

      {/* Newsletter */}
      <NewsletterForm />

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
