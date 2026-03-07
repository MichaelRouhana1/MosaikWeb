import { AdminLayoutClient } from "@/components/AdminLayoutClient";
import { getAdminStoreType } from "@/actions/admin-store";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeType = await getAdminStoreType();
  return <AdminLayoutClient initialStore={storeType}>{children}</AdminLayoutClient>;
}
