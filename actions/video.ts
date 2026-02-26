"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { homeVideo } from "@/db/schema";
import { uploadHomeVideo } from "@/lib/uploadImages";
import { auditLog } from "@/lib/audit";

/** Returns the active home page video, or null if none. */
export async function getHomeVideo() {
  const [video] = await db
    .select()
    .from(homeVideo)
    .where(eq(homeVideo.isActive, true))
    .limit(1);
  return video ?? null;
}

/** Fetches the active home video for admin. */
export async function getHomeVideoForAdmin() {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.list" });
    redirect("/");
  }
  const [video] = await db
    .select()
    .from(homeVideo)
    .where(eq(homeVideo.isActive, true))
    .limit(1);
  return video ?? null;
}

export async function deleteHomeVideo(id: number) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.delete" });
    redirect("/");
  }
  await db.delete(homeVideo).where(eq(homeVideo.id, id));
  auditLog({ userId: userId!, action: "video.delete", target: String(id) });
}

/** Uploads a home video file and adds it to the database. Admin only. Replaces existing video. */
export async function addHomeVideoFromFile(formData: FormData): Promise<{ error?: string }> {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "video.upload" });
    redirect("/");
  }

  const file = formData.get("video") as File | null;
  if (!file?.size) return { error: "No video provided" };

  const filename = `home-video-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadHomeVideo(file, filename);
  if (result.error) return { error: result.error };

  // Deactivate any existing video, then insert the new one
  await db.update(homeVideo).set({ isActive: false });
  const [inserted] = await db.insert(homeVideo).values({
    videoUrl: result.url,
    caption: null,
    isActive: true,
  }).returning({ id: homeVideo.id });
  if (inserted) auditLog({ userId: userId!, action: "video.upload", target: String(inserted.id) });
  return {};
}
