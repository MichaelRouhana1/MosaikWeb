"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "products";
const VALID_CATEGORIES = ["CLOTHING", "SHOES", "ACCESSORIES", "BAGS", "OTHER"] as const;

export async function createProduct(formData: FormData): Promise<{ error?: string; productId?: number }> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const price = formData.get("price") as string;
  const category = formData.get("category") as string;
  const isVisible = formData.get("isVisible") === "true";

  if (!name?.trim()) return { error: "Name is required" };
  if (!price || isNaN(parseFloat(price))) return { error: "Valid price is required" };
  if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
    return { error: "Invalid category" };
  }

  const imageUrls: string[] = [];
  const files = formData.getAll("images") as File[];

  if (files.some((f) => f?.size)) {
    const supabase = getSupabaseAdmin();
    for (const file of files) {
      if (!file?.size) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `product-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return { error: `Failed to upload ${file.name}: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }
  }

  const [product] = await db
    .insert(products)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      price: parseFloat(price).toFixed(2),
      category: category as (typeof VALID_CATEGORIES)[number],
      images: imageUrls,
      isVisible,
    })
    .returning({ id: products.id });

  return { productId: product.id };
}
