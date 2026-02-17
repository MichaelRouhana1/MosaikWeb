import Image from "next/image";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getHeroImages } from "@/actions/hero";
import { HeroCarousel } from "@/components/HeroCarousel";
import { VideoMuteToggle } from "@/components/VideoMuteToggle";
import { NewsletterForm } from "@/components/NewsletterForm";

const PEXELS = (id: number, w = 800, h = 1000) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;

const CATEGORIES = [
  { label: "Trousers", image: "/images/trousers.png", href: "/shop?category=CLOTHING&cat=trousers" },
  { label: "Shirts", image: "/images/shirts.png", href: "/shop?category=CLOTHING&cat=shirts" },
  { label: "T-Shirts", image: "/images/tshirts.png", href: "/shop?category=CLOTHING&cat=tshirts" },
  { label: "Hoodies", image: "/images/hoodies.png", href: "/shop?category=CLOTHING&cat=hoodies" },
  {
    label: "Jackets & Coats",
    image: "/images/A9C0AFA5-B129-4D89-8EE6-EC5C28086A2E.JPG",
    href: "/shop?category=CLOTHING&cat=jackets",
  },
  { label: "Jeans", image: "/images/jeans.png", href: "/shop?category=CLOTHING&cat=jeans" },
];

const LOOKS = [
  { label: "Everyday", image: "/images/everyday.png", href: "/shop" },
  { label: "Tailored Casual", image: PEXELS(4611700, 600, 800), href: "/shop" },
  { label: "Minimal Street", image: "/images/minimal-street.png", href: "/shop" },
];

export default async function HomePage() {
  const [discoverProducts, heroImages] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.isVisible, true))
      .orderBy(desc(products.id))
      .limit(8),
    getHeroImages(),
  ]);

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
            <h1 className="text-xl font-normal text-foreground mb-4">
              Clothing designed with intention.
            </h1>
            <p className="text-sm font-light text-foreground/90">
              Modern silhouettes. Thoughtful materials. Built to last.
            </p>
            <Link
              href="/shop"
              className="inline-block mt-8 text-sm font-normal text-foreground border-b border-foreground pb-1 hover:opacity-60 transition-opacity duration-200"
            >
              Explore the collection
            </Link>
          </div>
        </section>
      )}

      {/* Category Grid */}
      <section className="py-24 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(({ label, image, href }) => (
            <Link
              key={label}
              href={href}
              className="group relative block aspect-[3/4] overflow-hidden"
            >
              <Image
                src={image}
                alt={label}
                fill
                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
              />
              <p className="absolute bottom-4 left-4 text-sm font-normal text-foreground group-hover:opacity-100 opacity-90 transition-opacity">
                {label}
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
          <VideoMuteToggle videoSrc="/images/copy_1FA36497-0DD6-4C57-B22C-B21E1C628908.MOV" />
        </div>
      </section>

      {/* Lookbook */}
      <section className="py-24 px-6">
        <h2 className="text-sm font-medium text-foreground tracking-[0.2em] uppercase mb-12 text-center">
          Get the Look
        </h2>
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {LOOKS.map(({ label, image, href }) => (
            <Link key={label} href={href} className="flex-shrink-0 w-[280px] group">
              <div className="aspect-[3/4] overflow-hidden mb-4 relative">
                <Image
                  src={image}
                  alt={label}
                  fill
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                  unoptimized={image.startsWith("https://")}
                />
              </div>
              <p className="text-sm font-normal text-foreground">{label}</p>
            </Link>
          ))}
        </div>
      </section>

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
              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.id}`}
                  className="flex-shrink-0 w-[220px] group"
                >
                  <div className="aspect-[2/3] overflow-hidden mb-4 relative">
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
                      unoptimized={imageUrl.startsWith("https://")}
                    />
                  </div>
                  <p className="text-sm font-normal text-foreground">{product.name}</p>
                  <p className="text-sm font-light text-muted-foreground mt-1">${price}</p>
                </Link>
              );
            })
          ) : (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <Link key={i} href="/shop" className="flex-shrink-0 w-[220px] group">
                <div className="aspect-[2/3] overflow-hidden mb-4 bg-muted">
                  <div className="w-full h-full" />
                </div>
                <p className="text-sm font-normal text-foreground">—</p>
                <p className="text-sm font-light text-muted-foreground mt-1">—</p>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterForm />

      {/* Footer */}
      <footer className="border-t border-border bg-muted py-16 px-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
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
      </footer>
    </div>
  );
}
