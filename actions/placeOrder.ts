"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orders,
  orderItems,
  productVariants,
  products,
} from "@/db/schema";

export interface CartItem {
  productId: number;
  size: string;
  quantity: number;
  priceAtPurchase: string;
}

export interface PlaceOrderInput {
  userId?: string | null;
  guestEmail?: string | null;
  paymentMethod?: string;
  items: CartItem[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ orderId: number }> {
  const { userId, guestEmail, paymentMethod = "COD", items } = input;

  if (!items.length) {
    throw new Error("Cart is empty");
  }

  return db.transaction(async (tx) => {
    // Aggregate quantities per variant (productId + size)
    const variantQuantities = new Map<
      string,
      { productId: number; size: string; quantity: number; priceAtPurchase: string }
    >();
    for (const item of items) {
      const key = `${item.productId}|${item.size}`;
      const existing = variantQuantities.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        variantQuantities.set(key, {
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          priceAtPurchase: item.priceAtPurchase,
        });
      }
    }

    // Verify stock and deduct for each variant
    for (const { productId, size, quantity } of variantQuantities.values()) {

      const variantResults = await tx
        .select()
        .from(productVariants)
        .where(and(eq(productVariants.productId, productId), eq(productVariants.size, size)));
      const variant = variantResults[0];

      if (!variant) {
        throw new Error(`Variant not found: product ${productId}, size ${size}`);
      }

      if (variant.stock < quantity) {
        const productResults = await tx
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, productId));
        const product = productResults[0];
        const productName = product?.name ?? `Product #${productId}`;
        throw new Error(
          `Insufficient stock for "${productName}" size ${size}. Available: ${variant.stock}, requested: ${quantity}`
        );
      }

      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} - ${quantity}` })
        .where(eq(productVariants.id, variant.id));
    }

    // Calculate total from aggregated items
    let totalAmount = 0;
    for (const { quantity, priceAtPurchase } of variantQuantities.values()) {
      totalAmount += quantity * parseFloat(priceAtPurchase);
    }

    // Create order
    const [order] = await tx
      .insert(orders)
      .values({
        userId: userId ?? null,
        guestEmail: guestEmail ?? null,
        totalAmount: totalAmount.toFixed(2),
        status: "PENDING",
        paymentMethod,
      })
      .returning({ id: orders.id });

    if (!order) {
      throw new Error("Failed to create order");
    }

    // Create order items (one per cart item for line-item fidelity)
    const orderItemsToInsert = items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      priceAtPurchase: item.priceAtPurchase,
    }));

    await tx.insert(orderItems).values(orderItemsToInsert);

    return { orderId: order.id };
  });
}
