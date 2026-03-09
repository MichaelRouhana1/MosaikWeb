import { getSupabaseAdmin } from "@/lib/supabase";
import { validateUploadFile, sanitizeFilename } from "@/lib/security";
import fs from "fs";
import path from "path";

const BUCKET = "products";

/**
 * Generic upload function to handle file uploads to Supabase storage.
 * Falls back to local public directory if bucket doesn't exist.
 * Validates file type, MIME, and size before upload.
 */
async function uploadFile(
  file: File,
  filename: string,
  kind: "image" | "video",
  storageDir: string
): Promise<{ url: string; error?: string }> {
  const validation = validateUploadFile(file, kind);
  if (!validation.ok) return { url: "", error: validation.error };
  const safeFilename = sanitizeFilename(filename) || filename;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = validation.ext;
  const storagePath = `${storageDir}/${safeFilename}.${ext}`;

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

  // Fallback: save locally
  if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("404")) {
    try {
      const publicDir = path.join(process.cwd(), "public", "images", storageDir);
      fs.mkdirSync(publicDir, { recursive: true });
      const localPath = path.join(publicDir, `${safeFilename}.${ext}`);
      fs.writeFileSync(localPath, buffer);
      const url = `/images/${storageDir}/${safeFilename}.${ext}`;
      return { url };
    } catch (err) {
      console.error("Local upload fallback error:", err);
      return { url: "", error: `Failed to save ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}` };
    }
  }

  console.error("Supabase upload error:", uploadError);
  return { url: "", error: `Failed to upload ${file.name}: ${uploadError.message}` };
}

export async function uploadProductImage(file: File, filename: string) {
  return uploadFile(file, filename, "image", "product-images");
}

export async function uploadHeroImage(file: File, filename: string) {
  return uploadFile(file, filename, "image", "hero-images");
}

export async function uploadHomeVideo(file: File, filename: string) {
  return uploadFile(file, filename, "video", "home-video");
}

export async function uploadLookImage(file: File, filename: string) {
  return uploadFile(file, filename, "image", "lookbook");
}

export async function uploadProductImages(imageFiles: File[], prefix: string): Promise<{ urls: string[]; error?: string }> {
  const urls: string[] = [];
  for (const file of imageFiles) {
    const filename = `${prefix}-${Math.random().toString(36).slice(2)}`;
    const result = await uploadProductImage(file, filename);
    if (result.error) return { urls, error: result.error };
    urls.push(result.url);
  }
  return { urls };
}
