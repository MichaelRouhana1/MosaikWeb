import { getSupabaseAdmin } from "@/lib/supabase";
import fs from "fs";
import path from "path";

const BUCKET = "products";

/**
 * Uploads a file to Supabase storage. If the bucket doesn't exist (e.g. not configured),
 * falls back to saving to public/images/product-images/ for local development.
 */
export async function uploadProductImage(
  file: File,
  filename: string
): Promise<{ url: string; error?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `product-images/${filename}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (!uploadError) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return { url: urlData.publicUrl };
  }

  // Fallback: save to public/images/product-images/ when Supabase bucket is missing
  if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("404")) {
    try {
      const publicDir = path.join(process.cwd(), "public", "images", "product-images");
      fs.mkdirSync(publicDir, { recursive: true });
      const localPath = path.join(publicDir, `${filename}.${ext}`);
      fs.writeFileSync(localPath, buffer);
      const url = `/images/product-images/${filename}.${ext}`;
      return { url };
    } catch (err) {
      console.error("Local upload fallback error:", err);
      return { url: "", error: `Failed to save ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }

  console.error("Supabase upload error:", uploadError);
  return { url: "", error: `Failed to upload ${file.name}: ${uploadError.message}` };
}

const HERO_STORAGE_PATH = "hero-images";

/**
 * Uploads a hero image to Supabase storage. Falls back to public/images/hero-images/ when bucket is missing.
 */
export async function uploadHeroImage(
  file: File,
  filename: string
): Promise<{ url: string; error?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${HERO_STORAGE_PATH}/${filename}.${ext}`;

  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (!uploadError) {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return { url: urlData.publicUrl };
  }

  if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("404")) {
    try {
      const publicDir = path.join(process.cwd(), "public", "images", HERO_STORAGE_PATH);
      fs.mkdirSync(publicDir, { recursive: true });
      const localPath = path.join(publicDir, `${filename}.${ext}`);
      fs.writeFileSync(localPath, buffer);
      const url = `/images/${HERO_STORAGE_PATH}/${filename}.${ext}`;
      return { url };
    } catch (err) {
      console.error("Local upload fallback error:", err);
      return { url: "", error: `Failed to save ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }

  console.error("Supabase upload error:", uploadError);
  return { url: "", error: `Failed to upload ${file.name}: ${uploadError.message}` };
}
