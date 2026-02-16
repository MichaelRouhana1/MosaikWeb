import { CheckoutForm } from "@/components/CheckoutForm";
import type { CartItem } from "@/actions/placeOrder";

interface CheckoutPageProps {
  searchParams: Promise<{ cart?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  let cart: CartItem[];

  try {
    cart = params.cart ? (JSON.parse(decodeURIComponent(params.cart)) as CartItem[]) : [];
  } catch {
    cart = [];
  }

  // Demo cart when empty - replace with real cart from session/cookie in production
  if (cart.length === 0) {
    cart = [
      { productId: 1, size: "M", quantity: 1, priceAtPurchase: "29.99" },
      { productId: 2, size: "L", quantity: 2, priceAtPurchase: "49.99" },
    ];
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">Checkout</h1>
      <CheckoutForm cart={cart} />
    </div>
  );
}
