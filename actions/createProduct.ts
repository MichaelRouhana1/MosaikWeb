"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";
import { getValidCategorySlugs } from "@/actions/categories";
const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function createProduct(formData: FormData): Promise<{ error?: string; productId?: number }> {
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
  const validSlugs = await getValidCategorySlugs();
  if (!validSlugs.includes(categorySlug)) {
    return { error: "Invalid category" };
  }

  const imageUrls: string[] = [];
  const files = formData.getAll("images") as File[];

  if (files.some((f) => f?.size)) {
    for (const file of files) {
      if (!file?.size) continue;
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const result = await uploadProductImage(file, filename);
      if (result.error) return { error: result.error };
      imageUrls.push(result.url);
    }
  }

  const [product] = await db
    .insert(products)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      price: parseFloat(price).toFixed(2),
      category: "CLOTHING",
      categorySlug,
      color,
      images: imageUrls,
      isVisible,
    })
    .returning({ id: products.id });

  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  for (const size of SIZES) {
    const stock = Math.max(0, parseInt(String(formData.get(`stock_${size}`)), 10) || 0);
    const sku = `${slug}-${size}-${Date.now()}`;
    await db.insert(productVariants).values({
      productId: product.id,
      size,
      stock,
      sku,
    });
  }

  return { productId: product.id };
}
