import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAllHeroImages } from "@/actions/hero";
import { HeroAdminClient } from "@/components/HeroAdminClient";

export default async function AdminHeroPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const images = await getAllHeroImages();

  return <HeroAdminClient images={images} />;
}
