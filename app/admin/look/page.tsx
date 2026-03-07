import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllLookbookItems, getLookbookSectionVisible } from "@/actions/lookbook";
import { LookAdminClient } from "@/components/LookAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminLookPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const storeType = await getAdminStoreType();

  const [allItems, sectionVisible] = await Promise.all([
    getAllLookbookItems(),
    getLookbookSectionVisible(),
  ]);

  const items = allItems.filter((img) => img.storeType === storeType || img.storeType === "both");

  return <LookAdminClient items={items} sectionVisible={sectionVisible} initialStoreType={storeType} />;
}
