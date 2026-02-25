import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { PromosTable } from "./PromosTable";

export default async function AdminPromosPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Promo Codes</h1>
        <Link
          href="/admin/promos/new"
          className="px-6 py-2.5 bg-foreground text-background text-sm font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
        >
          Add Promo Code
        </Link>
      </div>
      <PromosTable promos={codes} />
    </div>
  );
}
