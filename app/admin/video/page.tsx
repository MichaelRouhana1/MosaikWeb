import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getHomeVideoForAdmin } from "@/actions/video";
import { VideoAdminClient } from "@/components/VideoAdminClient";

export default async function AdminVideoPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const video = await getHomeVideoForAdmin();

  return <VideoAdminClient video={video} />;
}
