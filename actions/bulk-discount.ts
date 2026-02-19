"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { revalidatePath } from "next/cache";

function parsePrice(price: string | null | undefined): number {
  if (price == null) return 0;
  const n = parseFloat(String(price));
  return Number.isFinite(n) ? n : 0;
}

function toDecimal(value: number): string {
  return value.toFixed(2);
}

export async function applyBulkDiscount(
  productIds: number[],
  discountType: "PERCENTAGE" | "FIXED",
  value: number
) {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  if (productIds.length === 0) return;

  const rows = await db
    .select({ id: products.id, price: products.price })
    .from(products)
    .where(inArray(products.id, productIds));

  for (const row of rows) {
    const price = parsePrice(row.price);
    let salePrice: string | null;

    if (discountType === "PERCENTAGE") {
      const multiplier = 1 - value / 100;
      salePrice = toDecimal(Math.max(0, price * multiplier));
    } else {
      if (value >= price) continue;
      salePrice = toDecimal(value);
    }

    await db
      .update(products)
      .set({ salePrice })
      .where(eq(products.id, row.id));
  }

  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function removeBulkDiscount(productIds: number[]) {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") redirect("/");

  if (productIds.length === 0) return;

  await db
    .update(products)
    .set({ salePrice: null })
    .where(inArray(products.id, productIds));

  revalidatePath("/admin/products");
  revalidatePath("/shop");
}
