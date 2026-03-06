"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq, max, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { lookbookItems, sectionSettings } from "@/db/schema";
import { uploadLookImage } from "@/lib/uploadImages";
import { validateHref } from "@/lib/security";
import { auditLog } from "@/lib/audit";

const LOOKBOOK_SECTION_KEY = "lookbook";

/** Returns whether the Get the Look section is visible on the home page. Defaults to true. */
export async function getLookbookSectionVisible(): Promise<boolean> {
  const [row] = await db
    .select()
    .from(sectionSettings)
    .where(eq(sectionSettings.sectionKey, LOOKBOOK_SECTION_KEY))
    .limit(1);
  return row?.isVisible ?? true;
}

/** Sets whether the Get the Look section is visible. Admin only. */
export async function setLookbookSectionVisible(visible: boolean) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "lookbook.visibility" });
    redirect("/");
  }

  const [existing] = await db
    .select()
    .from(sectionSettings)
    .where(eq(sectionSettings.sectionKey, LOOKBOOK_SECTION_KEY))
    .limit(1);

  if (existing) {
    await db
      .update(sectionSettings)
      .set({ isVisible: visible })
      .where(eq(sectionSettings.id, existing.id));
  } else {
    await db.insert(sectionSettings).values({
      sectionKey: LOOKBOOK_SECTION_KEY,
      isVisible: visible,
    });
  }
}

export async function getLookbookItems(storeType?: string) {
  const conditions = [eq(lookbookItems.isActive, true)];
  if (storeType) {
    conditions.push(inArray(lookbookItems.storeType, [storeType, "both"] as ("streetwear" | "formal" | "both")[]));
  }
  return db
    .select()
    .from(lookbookItems)
    .where(and(...conditions))
    .orderBy(asc(lookbookItems.order));
}

/** Fetches all lookbook items for admin. */
export async function getAllLookbookItems() {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "lookbook.list" });
    redirect("/");
  }
  return db
    .select()
    .from(lookbookItems)
    .orderBy(asc(lookbookItems.order));
}

export async function deleteLookbookItem(id: number) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "lookbook.delete" });
    redirect("/");
  }
  await db.delete(lookbookItems).where(eq(lookbookItems.id, id));
  auditLog({ userId: userId!, action: "lookbook.delete", target: String(id) });
}

export async function updateLookbookItem(
  id: number,
  data: { label?: string; href?: string; order?: number; storeType?: "streetwear" | "formal" | "both" }
) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "lookbook.update" });
    redirect("/");
  }
  const updateData: { label?: string; href?: string; order?: number; storeType?: "streetwear" | "formal" | "both" } = { ...data };
  if (data.href !== undefined) {
    const validated = validateHref(data.href);
    if (!validated.ok) throw new Error(validated.error);
    updateData.href = validated.href;
  }
  await db.update(lookbookItems).set(updateData).where(eq(lookbookItems.id, id));
  auditLog({ userId: userId!, action: "lookbook.update", target: String(id), details: data });
}

/** Uploads a look image and adds it to the database. Admin only. */
export async function addLookbookItemFromFile(formData: FormData): Promise<{ error?: string }> {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "lookbook.add" });
    redirect("/");
  }

  const file = formData.get("image") as File | null;
  const label = (formData.get("label") as string)?.trim();
  const storeType = (formData.get("storeType") as "streetwear" | "formal" | "both") || "both";
  const hrefRaw = ((formData.get("href") as string)?.trim()) || "/shop";
  const hrefValidation = validateHref(hrefRaw);
  if (!hrefValidation.ok) return { error: hrefValidation.error };
  const href = hrefValidation.href;

  if (!file?.size) return { error: "No image provided" };
  if (!label) return { error: "Label is required" };

  const filename = `look-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadLookImage(file, filename);
  if (result.error) return { error: result.error };

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(lookbookItems.order) })
    .from(lookbookItems);
  const nextOrder = (maxOrder ?? -1) + 1;

  const [inserted] = await db.insert(lookbookItems).values({
    label,
    imageUrl: result.url,
    href,
    order: nextOrder,
    storeType,
  }).returning({ id: lookbookItems.id });
  if (inserted) auditLog({ userId: userId!, action: "lookbook.add", target: String(inserted.id), details: { label } });
  return {};
}
