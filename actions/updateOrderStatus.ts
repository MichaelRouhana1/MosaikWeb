"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auditLog } from "@/lib/audit";
import { z } from "zod";

const VALID_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export async function updateOrderStatus(orderId: number, newStatus: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const validOrderId = z.number().int().positive().parse(orderId);
    const validStatus = z.enum(VALID_STATUSES).parse(newStatus);

    const { userId, sessionClaims } = await auth();
    if (sessionClaims?.metadata?.role !== "admin") {
      auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "order.status_update" });
      redirect("/");
    }

    await db
      .update(orders)
      .set({ status: validStatus })
      .where(eq(orders.id, validOrderId));

    auditLog({ userId: userId!, action: "order.status_update", target: String(validOrderId), details: { newStatus: validStatus } });
    revalidatePath(`/admin/orders/${validOrderId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message || "Validation failed" };
    }
    return { error: "An unexpected error occurred" };
  }
}
