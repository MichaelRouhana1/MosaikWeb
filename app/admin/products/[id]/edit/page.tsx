import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EditProductForm } from "@/components/EditProductForm";
import { getCategories } from "@/actions/categories";

export default async function EditProductPage({
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

  if (!product) notFound();

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  const categories = await getCategories();

  return (
    <div>
      <Link
        href="/admin/products"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to products
      </Link>
      <h1 className="text-2xl font-bold mb-8">Edit Product</h1>
      <EditProductForm product={product} variants={variants} categories={categories} />
    </div>
  );
}
