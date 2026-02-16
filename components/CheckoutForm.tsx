"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { placeOrder, type CartItem } from "@/actions/placeOrder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CheckoutFormProps {
  cart: CartItem[];
}

function placeOrderAction(
  _prevState: { error?: string; orderId?: number } | null,
  formData: FormData
): Promise<{ error?: string; orderId?: number }> {
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) {
    return Promise.resolve({ error: "Cart is empty" });
  }
  const items = JSON.parse(itemsJson) as CartItem[];
  return placeOrder({
    guestEmail: (formData.get("guestEmail") as string) || null,
    paymentMethod: (formData.get("paymentMethod") as string) || "COD",
    items,
  })
    .then(({ orderId }) => ({ orderId }))
    .catch((err) => ({ error: err instanceof Error ? err.message : "Order failed" }));
}

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(placeOrderAction, null);

  if (state?.orderId) {
    router.push(`/checkout/success?orderId=${state.orderId}`);
    return null;
  }

  const total = cart.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.priceAtPurchase),
    0
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="items" value={JSON.stringify(cart)} />
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact & payment</CardTitle>
            <CardDescription>
              Enter your details for order confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                name="guestEmail"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment method</Label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                defaultValue="COD"
              >
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>{cart.length} item(s) in your cart</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {cart.map((item, i) => (
                <li
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span>
                    Product #{item.productId} · {item.size} × {item.quantity}
                  </span>
                  <span>
                    $
                    {(
                      item.quantity * parseFloat(item.priceAtPurchase)
                    ).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={isPending || cart.length === 0}>
              {isPending ? "Placing order…" : "Place order"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
