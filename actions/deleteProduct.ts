"use server";

import { z } from "zod";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { auditLog } from "@/lib/audit";

export async function deleteProduct(productId: number): Promise<void> {
  const { userId, sessionClaims } = await auth();
  if (!userId || sessionClaims?.metadata?.role !== "admin") {
    auditLog({ userId: userId ?? null, action: "auth.failed_admin", target: "product.delete" });
    redirect("/");
  }

  const id = z.number().int().positive().parse(productId);

  await db.delete(products).where(eq(products.id, id));
  auditLog({ userId, action: "product.delete", target: String(id) });
}
