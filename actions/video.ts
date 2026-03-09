"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@/db";
import { homeVideo } from "@/db/schema";
import { uploadHomeVideo } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

/** Returns the active home page video, or null if none. */
export async function getHomeVideo(storeType?: string) {
  const conditions = [eq(homeVideo.isActive, true)];
  if (storeType) {
    const validStoreType = z.enum(["streetwear", "formal"]).parse(storeType);
    conditions.push(eq(homeVideo.storeType, validStoreType));
  }
  const [video] = await db
    .select()
    .from(homeVideo)
    .where(and(...conditions))
    .limit(1);
  return video ?? null;
}

/** Fetches the active home video for admin. */
export async function getHomeVideoForAdmin(storeType?: string) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.list" });
    redirect("/");
  }
  const conditions = [eq(homeVideo.isActive, true)];
  if (storeType) {
    const validStoreType = z.enum(["streetwear", "formal", "both"]).parse(storeType);
    conditions.push(inArray(homeVideo.storeType, [validStoreType, "both"]));
  }
  const [video] = await db
    .select()
    .from(homeVideo)
    .where(and(...conditions))
    .limit(1);
  return video ?? null;
}

export async function deleteHomeVideo(id: number) {
  const validId = z.number().int().positive().parse(id);
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.delete" });
    redirect("/");
  }
  await db.delete(homeVideo).where(eq(homeVideo.id, validId));
  auditLog({ userId: userId!, action: "video.delete", target: String(validId) });
}

/** Uploads a home video file and adds it to the database. Admin only. Replaces existing video. */
export async function addHomeVideoFromFile(formData: FormData): Promise<{ error?: string }> {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.upload" });
    redirect("/");
  }

  const file = formData.get("video") as File | null;
  const storeTypeRaw = formData.get("storeType") as string || "both";

  const addSchema = z.object({
    storeType: z.enum(["streetwear", "formal", "both"]).default("both")
  });

  const parsed = addSchema.safeParse({ storeType: storeTypeRaw });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Validation failed" };
  const { storeType } = parsed.data;

  if (!file?.size) return { error: "No video provided" };

  const filename = `home-video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadHomeVideo(file, filename);
  if (result.error) return { error: result.error };

  await db.update(homeVideo).set({ isActive: false }).where(eq(homeVideo.storeType, storeType));
  const [inserted] = await db.insert(homeVideo).values({
    videoUrl: result.url,
    caption: null,
    isActive: true,
    storeType,
  }).returning({ id: homeVideo.id });
  if (inserted) auditLog({ userId: userId!, action: "video.upload", target: String(inserted.id) });
  return {};
}
