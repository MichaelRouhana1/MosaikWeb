"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";

const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export async function updateOrderStatus(orderId: number, newStatus: string) {
  const { userId, sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "order.status_update" });
    redirect("/");
  }

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { error: "Invalid status" };
  }

  await db
    .update(orders)
    .set({ status: newStatus as (typeof VALID_STATUSES)[number] })
    .where(eq(orders.id, orderId));

  auditLog({ userId: userId!, action: "order.status_update", target: String(orderId), details: { newStatus } });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { success: true };
}
