"use server";

import { z } from "zod";

import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function setAdminStoreType(storeType: "streetwear" | "formal") {
    const { userId, sessionClaims } = await auth();
    if (!userId || sessionClaims?.metadata?.role !== "admin") {
        throw new Error("Unauthorized");
    }
    const validatedType = z.enum(["streetwear", "formal"]).parse(storeType);
    const cookieStore = await cookies();
    cookieStore.set("adminStore", validatedType, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}

export async function getAdminStoreType(): Promise<"streetwear" | "formal"> {
    const { userId, sessionClaims } = await auth();
    if (!userId || sessionClaims?.metadata?.role !== "admin") {
        return "streetwear"; // default if not admin
    }
    const cookieStore = await cookies();
    const val = cookieStore.get("adminStore")?.value;
    if (val === "formal") return "formal";
    return "streetwear"; // default
}

export async function migrateMissingStoreTypes() {
    const { userId, sessionClaims } = await auth();
    if (!userId || sessionClaims?.metadata?.role !== "admin") {
        return { error: "Unauthorized" };
    }
    // If some old products have NULL storeType (e.g., from before schema upgrade), set them to 'streetwear'
    try {
        await db.update(products).set({ storeType: "streetwear" }).where(isNull(products.storeType));
        return { success: true };
    } catch (err) {
        logger.error("Migration error:", err);
        return { error: String(err) };
    }
}
