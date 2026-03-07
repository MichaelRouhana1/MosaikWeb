"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminHeader } from "@/components/AdminHeader";

export function AdminLayoutClient({
  children,
  initialStore,
}: {
  children: React.ReactNode;
  initialStore: "streetwear" | "formal";
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="pl-0 md:pl-64 min-h-screen flex flex-col">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} initialStore={initialStore} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
