"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { wishlists, orders } from "@/db/schema";
import { redirect } from "next/navigation";
import { auditLog } from "@/lib/audit";

export async function deleteAccount() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Unauthorized");
    }

    // 1. Delete wishlists
    await db.delete(wishlists).where(eq(wishlists.userId, userId));

    // 2. Anonymize orders
    await db
        .update(orders)
        .set({
            userId: null,
            customerName: "Deleted User",
            guestEmail: null,
            phoneNumber: "Anonymized",
            addressLine1: "Anonymized",
            city: "Anonymized",
        })
        .where(eq(orders.userId, userId));

    // 3. Delete from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(userId);

    auditLog({ userId: null, action: "account.delete", target: userId });

    redirect("/");
}
