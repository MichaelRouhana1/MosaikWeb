"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, productColors } from "@/db/schema";
import { uploadProductImage, uploadProductImages } from "@/lib/uploadImages";
import { getValidCategorySlugs } from "@/actions/categories";
import { auditLog } from "@/lib/audit";
import { z } from "zod";
import { updateProductSchema } from "@/lib/schemas";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export async function updateProduct(
  productId: number,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const parsedId = z.number().int().positive().safeParse(productId);
  if (!parsedId.success) {
    return { success: false, error: "Validation failed" };
  }
  const validProductId = parsedId.data;

  const parsed = updateProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    categorySlug: formData.get("category"),
    isVisible: formData.get("isVisible") === "true",
    color_count: parseInt(String(formData.get("color_count") ?? "0"), 10),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "product.update" });
    redirect("/");
  }

  const { name, description, price, categorySlug, isVisible, color_count: colorCount } = parsed.data;

  const validSlugs = await getValidCategorySlugs();
  if (!validSlugs.includes(categorySlug)) {
    return { error: "Invalid category" };
  }

  type ColorEntry = {
    existingId: number | null;
    name: string;
    hexCode: string | null;
    existingUrls: string[];
    imageFiles: File[];
    stockBySize: Record<string, number>;
  };

  const colorEntries: ColorEntry[] = [];

  for (let i = 0; i < colorCount; i++) {
    const rawId = formData.get(`color_${i}_id`) as string;
    const existingId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : null;
    const colorName = (formData.get(`color_${i}_name`) as string)?.trim();
    const colorHex = (formData.get(`color_${i}_hex`) as string)?.trim() || null;
    const existingUrlsRaw = formData.get(`color_${i}_existing_urls`) as string;
    let existingUrls: string[] = [];
    try {
      existingUrls = existingUrlsRaw ? JSON.parse(existingUrlsRaw) : [];
    } catch {
      existingUrls = [];
    }
    const imageFiles = formData.getAll(`color_${i}_images`) as File[];
    const stockBySize: Record<string, number> = {};
    for (const size of SIZES) {
      stockBySize[size] = Math.max(0, parseInt(String(formData.get(`color_${i}_stock_${size}`)), 10) || 0);
    }
    if (!colorName) return { error: `Color ${i + 1} must have a name` };
    colorEntries.push({
      existingId,
      name: colorName,
      hexCode: colorHex,
      existingUrls: Array.isArray(existingUrls) ? existingUrls : [],
      imageFiles: imageFiles.filter((f) => f?.size),
      stockBySize,
    });
  }

  // Upload new images for each color
  const colorImageUrls: string[][] = [];
  for (let i = 0; i < colorEntries.length; i++) {
    const urls: string[] = [...colorEntries[i].existingUrls];
    const prefix = `product-${Date.now()}-${i}`;
    const result = await uploadProductImages(colorEntries[i].imageFiles, prefix);
    if (result.error) return { error: result.error };
    urls.push(...result.urls);
    colorImageUrls.push(urls);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price).toFixed(2),
        category: "CLOTHING",
        categorySlug,
        color: colorEntries[0]?.name ?? null,
        isVisible,
      })
      .where(eq(products.id, validProductId));

    const existingColors = await tx
      .select()
      .from(productColors)
      .where(eq(productColors.productId, validProductId));

    const colorIds: number[] = [];
    for (let i = 0; i < colorEntries.length; i++) {
      const entry = colorEntries[i];
      const imageUrls = colorImageUrls[i] ?? [];

      const existingColor = entry.existingId != null ? existingColors.find((c) => c.id === entry.existingId) : null;
      if (existingColor) {
        await tx
          .update(productColors)
          .set({
            name: entry.name,
            hexCode: entry.hexCode,
            imageUrls,
          })
          .where(eq(productColors.id, existingColor.id));
        colorIds.push(existingColor.id);
      } else {
        const [inserted] = await tx
          .insert(productColors)
          .values({
            productId: validProductId,
            name: entry.name,
            hexCode: entry.hexCode,
            imageUrls,
          })
          .returning({ id: productColors.id });
        colorIds.push(inserted.id);
      }
    }

    // Remove colors that are no longer in the form
    const keptIds = new Set(colorIds);
    for (const c of existingColors) {
      if (!keptIds.has(c.id)) {
        await tx.delete(productVariants).where(eq(productVariants.colorId, c.id));
        await tx.delete(productColors).where(eq(productColors.id, c.id));
      }
    }

    // Delete all variants for this product and re-insert (avoids duplicates/orphans when colors change)
    await tx.delete(productVariants).where(eq(productVariants.productId, validProductId));

    for (let i = 0; i < colorEntries.length; i++) {
      const colorId = colorIds[i];
      const stockBySize = colorEntries[i].stockBySize;

      for (const size of SIZES) {
        const stock = stockBySize[size] ?? 0;
        await tx.insert(productVariants).values({
          productId: validProductId,
          colorId,
          size,
          stock,
        });
      }
    }
  });

  auditLog({ userId, action: "product.update", target: String(validProductId), details: { name } });
  return {};
}
