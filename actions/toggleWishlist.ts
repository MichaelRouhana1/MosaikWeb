"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { wishlists } from "@/db/schema";
import { checkToggleWishlistLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function toggleWishlist(productId: number): Promise<{
  error?: string;
  inWishlist?: boolean;
}> {
  const validProductId = z.number().int().positive().parse(productId);
  const { userId } = await auth();
  if (!userId) {
    return { error: "Sign in to add to favorites" };
  }
  const limit = checkToggleWishlistLimit(userId);
  if (!limit.allowed) {
    return { error: "Too many requests. Please try again in a moment." };
  }

  const existing = await db
    .select()
    .from(wishlists)
    .where(
      and(
        eq(wishlists.userId, userId),
        eq(wishlists.productId, validProductId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(wishlists)
      .where(
        and(
          eq(wishlists.userId, userId),
          eq(wishlists.productId, validProductId)
        )
      );
    return { inWishlist: false };
  }

  await db.insert(wishlists).values({
    userId,
    productId: validProductId,
  });
  return { inWishlist: true };
}
