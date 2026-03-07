import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getHomeVideoForAdmin } from "@/actions/video";
import { VideoAdminClient } from "@/components/VideoAdminClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminVideoPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const storeType = await getAdminStoreType();
  const video = await getHomeVideoForAdmin(storeType);

  return <VideoAdminClient video={video} initialStoreType={storeType} />;
}
