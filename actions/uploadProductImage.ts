"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { validateUploadFile } from "@/lib/security";
import { logger } from "@/lib/logger";

const BUCKET = "products";

export async function uploadProductImage(
  file: File
): Promise<{ url: string } | { error: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  if (!file?.size) {
    return { error: "No file provided" };
  }

  const validation = validateUploadFile(file, "image");
  if (!validation.ok) return { error: validation.error };
  const path = `product-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${validation.ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error("Supabase upload error", uploadError);
    return { error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl };
}
