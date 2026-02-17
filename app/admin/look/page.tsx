import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllLookbookItems } from "@/actions/lookbook";
import { LookAdminClient } from "@/components/LookAdminClient";

export default async function AdminLookPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const items = await getAllLookbookItems();

  return <LookAdminClient items={items} />;
}
