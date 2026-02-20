"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, productVariants, productColors } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";
import { getValidCategorySlugs } from "@/actions/categories";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function createProduct(formData: FormData): Promise<{ error?: string; productId?: number }> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const price = formData.get("price") as string;
  const categorySlug = formData.get("category") as string;
  const isVisible = formData.get("isVisible") === "true";
  const colorCount = parseInt(String(formData.get("color_count") ?? "0"), 10);

  if (!name) return { error: "Name is required" };
  if (!price || isNaN(parseFloat(price))) return { error: "Valid price is required" };
  const validSlugs = await getValidCategorySlugs();
  if (!validSlugs.includes(categorySlug)) {
    return { error: "Invalid category" };
  }
  if (colorCount < 1) return { error: "Add at least one color" };

  // Parse colors from formData
  const colorEntries: Array<{
    name: string;
    hexCode: string | null;
    imageFiles: File[];
    stockBySize: Record<string, number>;
  }> = [];

  for (let i = 0; i < colorCount; i++) {
    const colorName = (formData.get(`color_${i}_name`) as string)?.trim();
    const colorHex = (formData.get(`color_${i}_hex`) as string)?.trim() || null;
    const imageFiles = formData.getAll(`color_${i}_images`) as File[];
    const stockBySize: Record<string, number> = {};
    for (const size of SIZES) {
      stockBySize[size] = Math.max(0, parseInt(String(formData.get(`color_${i}_stock_${size}`)), 10) || 0);
    }
    if (!colorName) return { error: `Color ${i + 1} must have a name` };
    colorEntries.push({
      name: colorName,
      hexCode: colorHex,
      imageFiles: imageFiles.filter((f) => f?.size),
      stockBySize,
    });
  }

  // Upload images for each color
  const colorImageUrls: string[][] = [];
  for (let i = 0; i < colorEntries.length; i++) {
    const urls: string[] = [];
    for (const file of colorEntries[i].imageFiles) {
      const filename = `product-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      const result = await uploadProductImage(file, filename);
      if (result.error) return { error: result.error };
      urls.push(result.url);
    }
    colorImageUrls.push(urls);
  }

  const productId = await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name,
        description: description || null,
        price: parseFloat(price).toFixed(2),
        category: "CLOTHING",
        categorySlug,
        color: colorEntries[0]?.name ?? null,
        isVisible,
      })
      .returning({ id: products.id });

    const colorIds: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const [pc] = await tx
        .insert(productColors)
        .values({
          productId: product.id,
          name: colorEntries[i].name,
          hexCode: colorEntries[i].hexCode,
          imageUrls: colorImageUrls[i] ?? [],
        })
        .returning({ id: productColors.id });
      colorIds.push(pc.id);
    }

    for (let i = 0; i < colorEntries.length; i++) {
      const colorId = colorIds[i];
      const stockBySize = colorEntries[i].stockBySize;
      for (const size of SIZES) {
        const stock = stockBySize[size] ?? 0;
        await tx.insert(productVariants).values({
          productId: product.id,
          colorId,
          size,
          stock,
        });
      }
    }

    return product.id;
  });

  return { productId };
}
