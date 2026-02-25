import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PromoCodeForm } from "@/components/PromoCodeForm";

export default async function NewPromoPage() {
  const { sessionClaims } = await auth();
  if (sessionClaims?.metadata?.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <Link
        href="/admin/promos"
        className="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to promo codes
      </Link>
      <h1 className="text-2xl font-bold mb-8">Add Promo Code</h1>
      <PromoCodeForm />
    </div>
  );
}
