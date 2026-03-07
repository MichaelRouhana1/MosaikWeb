import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllCategories } from "@/actions/categories";
import { CategoriesAdminClient } from "@/components/CategoriesAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminCategoriesPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const allCategories = await getAllCategories();
  const storeType = await getAdminStoreType();
  const categories = allCategories.filter((c) => c.storeType === storeType || c.storeType === "both");

  return <CategoriesAdminClient categories={categories} initialStoreType={storeType} />;
}
