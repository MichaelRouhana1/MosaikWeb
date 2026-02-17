"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { lookbookItems } from "@/db/schema";
import { uploadLookImage } from "@/lib/uploadImages";

export async function getLookbookItems() {
  return db
    .select()
    .from(lookbookItems)
    .where(eq(lookbookItems.isActive, true))
    .orderBy(asc(lookbookItems.order));
}

/** Fetches all lookbook items for admin. */
export async function getAllLookbookItems() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");
  return db
    .select()
    .from(lookbookItems)
    .orderBy(asc(lookbookItems.order));
}

export async function deleteLookbookItem(id: number) {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");
  await db.delete(lookbookItems).where(eq(lookbookItems.id, id));
}

export async function updateLookbookItem(
  id: number,
  data: { label?: string; href?: string; order?: number }
) {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");
  await db.update(lookbookItems).set(data).where(eq(lookbookItems.id, id));
}

/** Uploads a look image and adds it to the database. Admin only. */
export async function addLookbookItemFromFile(formData: FormData): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const file = formData.get("image") as File | null;
  const label = (formData.get("label") as string)?.trim();
  const href = ((formData.get("href") as string)?.trim()) || "/shop";

  if (!file?.size) return { error: "No image provided" };
  if (!label) return { error: "Label is required" };

  const filename = `look-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadLookImage(file, filename);
  if (result.error) return { error: result.error };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(lookbookItems.order) })
    .from(lookbookItems);
  const nextOrder = (maxOrder ?? -1) + 1;

  await db.insert(lookbookItems).values({
    label,
    imageUrl: result.url,
    href,
    order: nextOrder,
  });
  return {};
}
