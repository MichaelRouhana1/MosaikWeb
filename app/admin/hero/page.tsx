import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllHeroImages } from "@/actions/hero";
import { HeroAdminClient } from "@/components/HeroAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminHeroPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const storeType = await getAdminStoreType();
  const allImages = await getAllHeroImages();

  // Filter by currently selected admin store (plus "both")
  const images = allImages.filter((img) => img.storeType === storeType || img.storeType === "both");

  return <HeroAdminClient images={images} initialStoreType={storeType} />;
}
