"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productCategories } from "@/db/schema";
import { uploadProductImage } from "@/lib/uploadImages";

export type ProductCategory = typeof productCategories.$inferSelect;

/** Valid slugs for shop filtering (from DB) */
export async function getValidCategorySlugs(): Promise<string[]> {
  const cats = await db.select({ slug: productCategories.slug }).from(productCategories);
  return cats.map((c) => c.slug);
}

/** All categories for burger menu, shop, etc. */
export async function getCategories(): Promise<ProductCategory[]> {
  return db
    .select()
    .from(productCategories)
    .orderBy(asc(productCategories.sortOrder), asc(productCategories.id));
}

/** Categories to show on home page (show_on_home, limit 6) */
export async function getCategoriesForHome(): Promise<ProductCategory[]> {
  return db
    .select()
    .from(productCategories)
    .where(eq(productCategories.showOnHome, true))
    .orderBy(asc(productCategories.sortOrder))
    .limit(6);
}

/** Admin: get all categories */
export async function getAllCategories(): Promise<ProductCategory[]> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");
  return getCategories();
}

/** Admin: create category */
export async function createCategory(formData: FormData): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const label = (formData.get("label") as string)?.trim();
  const showOnHome = formData.get("showOnHome") === "true";
  const imageFile = formData.get("image") as File | null;

  if (!slug) return { error: "Slug is required" };
  if (!label) return { error: "Label is required" };

  const existing = await db.select().from(productCategories).where(eq(productCategories.slug, slug)).limit(1);
  if (existing.length > 0) return { error: "A category with this slug already exists" };

  let imageUrl: string | null = null;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `category-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url;
  }

  const allCats = await db.select({ sortOrder: productCategories.sortOrder }).from(productCategories);
  const nextSortOrder =
    allCats.length === 0 ? 0 : Math.max(0, ...allCats.map((r) => r.sortOrder ?? 0)) + 1;

  await db.insert(productCategories).values({
    slug,
    label,
    image: imageUrl,
    showOnHome,
    sortOrder: nextSortOrder,
  });
  return {};
}

/** Admin: update category */
export async function updateCategory(
  id: number,
  formData: FormData
): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const label = (formData.get("label") as string)?.trim();
  const showOnHome = formData.get("showOnHome") === "true";
  const imageFile = formData.get("image") as File | null;

  if (!slug) return { error: "Slug is required" };
  if (!label) return { error: "Label is required" };

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1);
  if (!existing) return { error: "Category not found" };

  const existingSlug = await db.select().from(productCategories).where(eq(productCategories.slug, slug)).limit(1);
  if (existingSlug.length > 0 && existingSlug[0].id !== id) return { error: "A category with this slug already exists" };

  let imageUrl: string | null = existing.image;
  if (imageFile?.size) {
    const result = await uploadProductImage(imageFile, `category-${slug}-${Date.now()}`);
    if (result.error) return { error: result.error };
    imageUrl = result.url;
  }

  await db
    .update(productCategories)
    .set({ slug, label, image: imageUrl, showOnHome })
    .where(eq(productCategories.id, id));
  return {};
}

/** Admin: delete category */
export async function deleteCategory(id: number): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1);
  if (!existing) return { error: "Category not found" };

  await db.delete(productCategories).where(eq(productCategories.id, id));
  return {};
}
