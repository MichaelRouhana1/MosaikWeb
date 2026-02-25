"use server";

import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/db";
import {
  orders,
  orderItems,
  productVariants,
  products,
  promoCodes,
} from "@/db/schema";
import { validatePromoInTransaction } from "@/actions/promo";

const DEFAULT_SHIPPING_FEE = 5;

const cartItemSchema = z.object({
  productId: z.coerce.number(),
  size: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  priceAtPurchase: z.string(),
});

const placeOrderSchema = z.object({
  userId: z.string().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  paymentMethod: z.string().default("COD"),
  customerName: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
  promoCode: z.string().trim().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export async function placeOrder(input: PlaceOrderInput): Promise<{ orderId: number }> {
  const parseResult = placeOrderSchema.safeParse(input);
  if (!parseResult.success) {
    const firstError = parseResult.error.flatten().fieldErrors;
    const message = Object.entries(firstError)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
      .join("; ");
    throw new Error(message);
  }

  const {
    userId,
    guestEmail,
    paymentMethod,
    customerName,
    phoneNumber,
    addressLine1,
    city,
    items,
    promoCode,
  } = parseResult.data;

  const orderResult = await db.transaction(async (tx) => {
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

    const subtotalAmount = Array.from(variantQuantities.values()).reduce(
      (sum, { quantity, priceAtPurchase }) => sum + quantity * parseFloat(priceAtPurchase),
      0
    );

    let discountAmount = 0;
    let promoCodeId: number | null = null;
    const shippingFee = DEFAULT_SHIPPING_FEE;

    if (promoCode?.trim()) {
      const validated = await validatePromoInTransaction(
        tx,
        promoCode.trim(),
        subtotalAmount,
        shippingFee
      );
      discountAmount = validated.discountAmount;
      promoCodeId = validated.promoCodeId;
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingFee);

    const [order] = await tx
      .insert(orders)
      .values({
        userId: userId ?? null,
        guestEmail: guestEmail ?? null,
        customerName,
        phoneNumber,
        addressLine1,
        city,
        subtotalAmount: subtotalAmount.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        shippingFee: shippingFee.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        promoCodeId,
        status: "PENDING",
        paymentMethod,
      })
      .returning({ id: orders.id });

    if (promoCodeId != null) {
      await tx
        .update(promoCodes)
        .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
        .where(eq(promoCodes.id, promoCodeId));
    }

    if (!order) {
      throw new Error("Failed to create order");
    }

    const orderItemsToInsert = items.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      priceAtPurchase: item.priceAtPurchase,
    }));

    await tx.insert(orderItems).values(orderItemsToInsert);

    return { orderId: order.id, totalAmount: totalAmount.toFixed(2), guestEmail };
  });

  const emailTo = guestEmail || undefined;
  if (emailTo && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      await resend.emails.send({
        from: fromEmail,
        to: emailTo,
        subject: `Order #${orderResult.orderId} confirmed`,
        html: `
          <h1>Order Confirmed</h1>
          <p>Hi ${customerName},</p>
          <p>Thank you for your order. Your order #${orderResult.orderId} has been placed successfully.</p>
          <p><strong>Total:</strong> $${orderResult.totalAmount}</p>
          <p><strong>Payment:</strong> Cash on Delivery (COD)</p>
          <p><strong>Delivery address:</strong><br/>
          ${addressLine1}<br/>
          ${city}</p>
        `,
      });
    } catch (err) {
      console.error("Failed to send confirmation email:", err);
    }
  }

  return { orderId: orderResult.orderId };
}
