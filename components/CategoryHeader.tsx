const CATEGORY_CONFIG: Record<
  string,
  { label: string; subtitle: string }
> = {
  CLOTHING: {
    label: "Clothing",
    subtitle: "Modern silhouettes and thoughtful materials",
  },
  SHOES: {
    label: "Shoes",
    subtitle: "Quality footwear for every occasion",
  },
  ACCESSORIES: {
    label: "Accessories",
    subtitle: "Finishing touches for your look",
  },
  BAGS: {
    label: "Bags",
    subtitle: "Functional and refined",
  },
  OTHER: {
    label: "Other",
    subtitle: "Explore our collection",
  },
};

const SLUG_CONFIG: Record<string, { label: string; subtitle: string }> = {
  jeans: { label: "Jeans", subtitle: "Slim and straight fits in premium denim" },
  trousers: { label: "Trousers", subtitle: "Tailored trousers for every occasion" },
  shirts: { label: "Shirts", subtitle: "Classic and contemporary shirts" },
  tshirts: { label: "T-Shirts", subtitle: "Essential everyday tees" },
  hoodies: { label: "Hoodies", subtitle: "Comfortable and versatile" },
  jackets: { label: "Jackets & Coats", subtitle: "Layer up with style" },
};

interface CategoryHeaderProps {
  category: string | null;
  categorySlug?: string | null;
}

export function CategoryHeader({ category, categorySlug }: CategoryHeaderProps) {
  const slugConfig = categorySlug ? SLUG_CONFIG[categorySlug] : null;
  const categoryConfig = category ? CATEGORY_CONFIG[category] : null;
  const config = slugConfig ?? categoryConfig;
  const label = config?.label ?? "Shop";
  const subtitle =
    config?.subtitle ?? "Explore our collection of modern essentials";

  return (
    <header className="text-center py-12 px-6 border-b border-border">
      <h1 className="text-3xl font-bold text-foreground">{label}</h1>
      <p className="mt-2 text-sm font-light text-muted-foreground">{subtitle}</p>
    </header>
  );
}
