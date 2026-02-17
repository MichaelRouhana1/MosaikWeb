"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";

const VALID_CATEGORY_SLUGS = ["trousers", "shirts", "tshirts", "hoodies", "jackets", "jeans"] as const;
const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function updateProduct(
  productId: number,
  formData: FormData
): Promise<{ error?: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const price = formData.get("price") as string;
  const categorySlug = formData.get("category") as string;
  const color = (formData.get("color") as string)?.trim() || null;
  const isVisible = formData.get("isVisible") === "true";

  if (!name?.trim()) return { error: "Name is required" };
  if (!price || isNaN(parseFloat(price))) return { error: "Valid price is required" };
  if (!VALID_CATEGORY_SLUGS.includes(categorySlug as (typeof VALID_CATEGORY_SLUGS)[number])) {
    return { error: "Invalid category" };
  }

  const [existing] = await db
    .select({ images: products.images })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  let imageUrls: string[] = existing?.images ?? [];

  const files = formData.getAll("images") as File[];
  if (files.some((f) => f?.size)) {
    for (const file of files) {
      if (!file?.size) continue;
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await uploadProductImage(file, filename);
      if (result.error) return { error: result.error };
      imageUrls = [...imageUrls, result.url];
    }
  }

  await db
    .update(products)
    .set({
      name: name.trim(),
      description: description?.trim() || null,
      price: parseFloat(price).toFixed(2),
      category: "CLOTHING",
      categorySlug: categorySlug as (typeof VALID_CATEGORY_SLUGS)[number],
      color,
      images: imageUrls,
      isVisible,
    })
    .where(eq(products.id, productId));

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const existingVariants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));

  for (const size of SIZES) {
    const stock = Math.max(0, parseInt(String(formData.get(`stock_${size}`)), 10) || 0);
    const existing = existingVariants.find((v) => v.size === size);
    const sku = `${slug}-${size}-${Date.now()}`;

    if (existing) {
      await db
        .update(productVariants)
        .set({ stock })
        .where(eq(productVariants.id, existing.id));
    } else {
      await db.insert(productVariants).values({
        productId,
        size,
        stock,
        sku,
      });
    }
  }

  return {};
}
