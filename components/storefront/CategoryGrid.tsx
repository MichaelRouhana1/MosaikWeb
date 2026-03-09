import Link from "next/link";
import Image from "next/image";
import { type ProductCategory } from "@/db/schema";

interface CategoryGridProps {
    categories: ProductCategory[];
    storeSlugs: string[];
    storeType: string;
}

export function CategoryGrid({ categories, storeSlugs, storeType }: CategoryGridProps) {
    return (
        <section className="py-24 px-6">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.filter(c => storeSlugs.includes(c.slug)).map((cat) => (
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
                        />
                        <p className="absolute bottom-4 left-4 text-sm font-normal text-foreground group-hover:opacity-100 opacity-90 transition-opacity">
                            {cat.label}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
