import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { Product } from "@/db/schema";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images?.[0];
  const price = typeof product.price === "string" ? product.price : String(product.price);

  return (
    <Link href={`/shop/${product.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full bg-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <span className="text-sm">No image</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
          <h3 className="mt-1 font-semibold">{product.name}</h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {product.description}
            </p>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="font-semibold">${price}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
