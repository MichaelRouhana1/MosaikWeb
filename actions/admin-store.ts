"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isNull } from "drizzle-orm";

export async function setAdminStoreType(storeType: "streetwear" | "formal") {
    const cookieStore = await cookies();
    cookieStore.set("adminStore", storeType, { path: "/" });
}

export async function getAdminStoreType(): Promise<"streetwear" | "formal"> {
    const cookieStore = await cookies();
    const val = cookieStore.get("adminStore")?.value;
    if (val === "formal") return "formal";
    return "streetwear"; // default
}

export async function migrateMissingStoreTypes() {
    // If some old products have NULL storeType (e.g., from before schema upgrade), set them to 'streetwear'
    try {
        await db.update(products).set({ storeType: "streetwear" }).where(isNull(products.storeType));
        return { success: true };
    } catch (err) {
        console.error("Migration error:", err);
        return { error: String(err) };
    }
}
