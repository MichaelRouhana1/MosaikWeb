"use server";

import { cookies } from "next/headers";

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
