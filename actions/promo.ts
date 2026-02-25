"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";

const DEFAULT_SHIPPING_FEE = 5;

export type PromoDiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";

export interface ValidatePromoResult {
  discountAmount: number;
  promoCodeId: number;
  code: string;
  discountType: PromoDiscountType;
}

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

function computeDiscount(
  discountType: string,
  discountValue: number,
  cartSubtotal: number,
  shippingFee: number
): number {
  switch (discountType) {
    case "PERCENTAGE":
      return Math.min((cartSubtotal * discountValue) / 100, cartSubtotal);
    case "FIXED_AMOUNT":
      return Math.min(discountValue, cartSubtotal);
    case "FREE_SHIPPING":
      return shippingFee;
    default:
      return 0;
  }
}

async function validateAndGetPromo(
  client: DbClient,
  code: string,
  cartSubtotal: number,
  shippingFee: number
): Promise<ValidatePromoResult & { promo: typeof promoCodes.$inferSelect }> {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("Please enter a promo code");
  }

  const [promo] = await client
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.code, normalizedCode), eq(promoCodes.isActive, true)))
    .limit(1);

  if (!promo) {
    throw new Error("Invalid code");
  }

  if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
    throw new Error("Code expired");
  }

  if (promo.maxUses != null && (promo.currentUses ?? 0) >= promo.maxUses) {
    throw new Error("Usage limit reached");
  }

  const minOrder = parseFloat(String(promo.minOrderAmount ?? 0));
  if (cartSubtotal < minOrder) {
    throw new Error(`Minimum order amount not met ($${minOrder.toFixed(2)} required)`);
  }

  const discountValue = parseFloat(String(promo.discountValue ?? 0));
  const discountAmount = Math.round(
    computeDiscount(promo.discountType, discountValue, cartSubtotal, shippingFee) * 100
  ) / 100;

  return {
    discountAmount,
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType as PromoDiscountType,
    promo,
  };
}

/**
 * Validates a promo code and returns the discount amount.
 * Throws an error with a user-friendly message if validation fails.
 */
export async function validatePromoCode(
  code: string,
  cartSubtotal: number,
  shippingFee: number = DEFAULT_SHIPPING_FEE
): Promise<ValidatePromoResult> {
  const result = await validateAndGetPromo(db, code, cartSubtotal, shippingFee);
  return {
    discountAmount: result.discountAmount,
    promoCodeId: result.promoCodeId,
    code: result.code,
    discountType: result.discountType,
  };
}

/**
 * Validates promo inside a transaction and returns discount info.
 * Used by placeOrder to prevent race conditions.
 */
export async function validatePromoInTransaction(
  tx: DbClient,
  code: string,
  cartSubtotal: number,
  shippingFee: number
): Promise<{ discountAmount: number; promoCodeId: number }> {
  const result = await validateAndGetPromo(tx, code, cartSubtotal, shippingFee);
  return {
    discountAmount: result.discountAmount,
    promoCodeId: result.promoCodeId,
  };
}

// --- Admin CRUD ---

async function requireAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }
}

export async function createPromoCode(formData: FormData): Promise<{ error?: string; id?: number }> {
  await requireAdmin();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const discountType = formData.get("discountType") as string;
  const discountValue = parseFloat(String(formData.get("discountValue") ?? 0));
  const minOrderAmount = parseFloat(String(formData.get("minOrderAmount") ?? 0));
  const maxUsesRaw = formData.get("maxUses") as string;
  const maxUses = maxUsesRaw?.trim() ? parseInt(maxUsesRaw, 10) : null;
  const expiresAtRaw = formData.get("expiresAt") as string;
  const expiresAt = expiresAtRaw?.trim() ? new Date(expiresAtRaw) : null;

  if (!code) return { error: "Code is required" };
  if (!["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"].includes(discountType)) {
    return { error: "Invalid discount type" };
  }
  if (discountType !== "FREE_SHIPPING" && (isNaN(discountValue) || discountValue < 0)) {
    return { error: "Valid discount value is required" };
  }

  try {
    const [inserted] = await db
      .insert(promoCodes)
      .values({
        code,
        discountType: discountType as "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING",
        discountValue: (discountType === "FREE_SHIPPING" ? 0 : discountValue).toFixed(2),
        minOrderAmount: minOrderAmount.toFixed(2),
        maxUses,
        expiresAt,
      })
      .returning({ id: promoCodes.id });
    if (!inserted) return { error: "Failed to create promo code" };
    return { id: inserted.id };
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
      return { error: "A promo code with this code already exists" };
    }
    return { error: "Failed to create promo code" };
  }
}

export async function togglePromoStatus(id: number): Promise<{ error?: string }> {
  await requireAdmin();
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
  if (!promo) return { error: "Promo not found" };
  await db
    .update(promoCodes)
    .set({ isActive: !promo.isActive })
    .where(eq(promoCodes.id, id));
  return {};
}

export async function deletePromoCode(id: number): Promise<{ error?: string }> {
  await requireAdmin();
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
  return {};
}
