import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;

  return (
    <div className="container mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Order confirmed</h1>
      {orderId && (
        <p className="text-muted-foreground">
          Your order <strong>#{orderId}</strong> has been placed successfully.
        </p>
      )}
      <Button asChild>
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}
