import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllCategories } from "@/actions/categories";
import { CategoriesAdminClient } from "@/components/CategoriesAdminClient";

export default async function AdminCategoriesPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const categories = await getAllCategories();

  return <CategoriesAdminClient categories={categories} />;
}
