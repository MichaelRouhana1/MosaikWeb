import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/admin/products/new">Create Product</Link>
        </Button>
      </div>
    </div>
  );
}
