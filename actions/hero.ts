"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { heroImages } from "@/db/schema";
import { uploadHeroImage } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";

export async function getHeroImages() {
  return db
    .select()
    .from(heroImages)
    .where(eq(heroImages.isActive, true))
    .orderBy(asc(heroImages.order));
}

/** Fetches all hero images for admin (including inactive). */
export async function getAllHeroImages() {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.list" });
    redirect("/");
  }
  return db
    .select()
    .from(heroImages)
    .orderBy(asc(heroImages.order));
}

export async function addHeroImage(imageUrl: string, altText?: string) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.add" });
    redirect("/");
  }
  const [image] = await db
    .insert(heroImages)
    .values({
      imageUrl,
      altText: altText ?? null,
    })
    .returning();
  if (image) auditLog({ userId: userId!, action: "hero.add", target: String(image.id) });
  return image;
}

export async function deleteHeroImage(id: number) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "hero.delete" });
    redirect("/");
  }
  await db.delete(heroImages).where(eq(heroImages.id, id));
  auditLog({ userId: userId!, action: "hero.delete", target: String(id) });
}

/** Uploads a hero image file and adds it to the database. Admin only. */
export async function addHeroImageFromFile(formData: FormData): Promise<{ error?: string }> {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  const file = formData.get("image") as File | null;
  if (!file?.size) return { error: "No image provided" };

  const filename = `hero-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadHeroImage(file, filename);
  if (result.error) return { error: result.error };

  await addHeroImage(result.url);
  return {};
}
