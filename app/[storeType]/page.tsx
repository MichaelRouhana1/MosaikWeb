import Image from "next/image";
import Link from "next/link";
import { eq, desc, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { products, productColors, productCategories } from "@/db/schema";
import { getHeroImages } from "@/actions/hero";
import { getHomeVideo } from "@/actions/video";
import { getLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { getCategoriesForHome, getStoreCategorySlugs } from "@/actions/categories";
import { getProductDisplayPrice, isProductOnSale, getProductDiscountPercent } from "@/lib/utils";
import { notFound } from "next/navigation";
import { HeroCarousel } from "@/components/HeroCarousel";
import { VideoMuteToggle } from "@/components/VideoMuteToggle";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ storeType: string }> }): Promise<Metadata> {
  const { storeType } = await params;
  const title = storeType === "streetwear" ? "Streetwear" : storeType === "formal" ? "Formal" : "Shop";
  return {
    title: `MOSAIK | ${title}`,
  };
}

const PEXELS = (id: number, w = 800, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

export default async function HomePage({ params }: { params: Promise<{ storeType: string }> }) {
  const { storeType } = await params;
  if (storeType !== "streetwear" && storeType !== "formal") return notFound();

  const storeSlugs = await getStoreCategorySlugs(storeType);

  const [productList, heroImages, homeVideo, lookbookItems, lookbookSectionVisible, homeCategories, allCats] =
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
      db.select().from(productCategories),
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
  const discoverProducts = productList.map((p) => ({
    ...p,
    images: firstImageByProductId[p.id] ? [firstImageByProductId[p.id]] : [],
  }));

  return (
    <div className="pt-14">
      {/* Hero - dynamic carousel or static fallback */}
      {heroImages.length > 0 ? (
        <HeroCarousel images={heroImages} />
      ) : (
        <section className="w-full min-h-[50vh] sm:min-h-[60vh] md:h-[75vh] flex items-center justify-center relative overflow-hidden">
          <Image
            src={PEXELS(3748221, 1920, 1080)}
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="relative z-10 max-w-[36ch] text-center px-6">
            <h1 className="text-3xl font-normal text-foreground mb-4 capitalize">
              {storeType} Collection
            </h1>
            <p className="text-sm font-light text-foreground/90">
              Coming soon. We are carefully curating our new collection.
            </p>
            <div className="flex justify-center gap-6 mt-8 relative z-20">
              <Link
                href="/"
                className="inline-block text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60 transition-opacity duration-200"
              >
                Back to Mosaik
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Category Grid - only categories with show_on_home, max 6 */}
      <section className="py-24 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {homeCategories.filter(c => storeSlugs.includes(c.slug)).map((cat) => (
            <Link
              key={cat.id}
              href={`/${storeType}/shop?cat=${cat.slug}`}
              className="group relative block aspect-[3/4] overflow-hidden"
            >
              <Image
                src={cat.image ?? "/images/trousers.png"}
                alt={cat.label}
                fill
                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                unoptimized={cat.image?.startsWith("http")}
              />
              <p className="absolute bottom-4 left-4 text-sm font-normal text-foreground group-hover:opacity-100 opacity-90 transition-opacity">
                {cat.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial Promotion */}
      <section className="w-full bg-muted py-24">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-lg font-normal text-foreground leading-relaxed max-w-[32ch]">
              Two pieces. Thoughtfully paired.
              <br />
              Designed to work together.
            </p>
          </div>
          <VideoMuteToggle videoSrc={homeVideo?.videoUrl ?? "/images/copy_1FA36497-0DD6-4C57-B22C-B21E1C628908.MOV"} className="max-h-[70vh]" />
        </div>
      </section>

      {/* Lookbook */}
      {lookbookSectionVisible && (
        <section className="py-24 px-6">
          <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center">
            Get the Look
          </h2>
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {lookbookItems.map((item) => (
              <Link key={item.id} href={item.href} className="group">
                <div className="aspect-[3/4] overflow-hidden mb-4 relative">
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    fill
                    className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                    unoptimized={item.imageUrl.startsWith("https://")}
                  />
                </div>
                <p className="text-sm font-normal text-foreground">{item.label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product Discovery */}
      <section className="py-24 px-6 bg-background">
        <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center">
          Discover
        </h2>
        <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
          {discoverProducts.length > 0 ? (
            discoverProducts.map((product) => {
              const imageUrl = product.images?.[0] ?? PEXELS(708440, 440, 660);
              const price = typeof product.price === "string" ? product.price : String(product.price);
              const displayPrice = getProductDisplayPrice(product);
              const onSale = isProductOnSale(product);
              const percentOff = getProductDiscountPercent(product);
              const itemStoreType = product.storeType || storeType;
              return (
                <Link
                  key={product.id}
                  href={`/${itemStoreType}/product/${product.id}`}
                  className="flex-shrink-0 w-[220px] group"
                >
                  <div className="aspect-[2/3] overflow-hidden mb-4 relative">
                    {onSale && percentOff > 0 && (
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-destructive text-destructive-foreground">
                        -{percentOff}%
                      </span>
                    )}
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                      unoptimized={imageUrl.startsWith("https://")}
                    />
                  </div>
                  <p className="text-sm font-normal text-foreground">{product.name}</p>
                  <p className="text-sm font-light text-muted-foreground mt-1">
                    {onSale ? (
                      <>
                        <span className="line-through">${price}</span>{" "}
                        <span className="text-destructive font-medium">${displayPrice}</span>
                      </>
                    ) : (
                      `$${displayPrice}`
                    )}
                  </p>
                </Link>
              );
            })
          ) : (
            <div className="w-full text-center py-12">
              <p className="text-sm font-normal text-muted-foreground">
                No products available yet. Check back soon.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterForm />

      {/* Footer */}
      <footer className="border-t border-border bg-muted py-16 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Customer Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm font-normal text-foreground hover:opacity-60">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="text-sm font-normal text-foreground hover:opacity-60">
                  Shipping
                </Link>
              </li>
              <li>
                <Link href="/returns" className="text-sm font-normal text-foreground hover:opacity-60">
                  Returns
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm font-normal text-foreground hover:opacity-60">
                  About
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm font-normal text-foreground hover:opacity-60">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm font-normal text-foreground hover:opacity-60">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm font-normal text-foreground hover:opacity-60">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-4">Follow</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm font-normal text-foreground hover:opacity-60">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="text-sm font-normal text-foreground hover:opacity-60">
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer >
    </div >
  );
}
