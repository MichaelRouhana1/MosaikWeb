"use client";

import { useState } from "react";
import { StockHoverCell } from "./StockHoverCell";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/actions/deleteProduct";

const CATEGORIES = [
  { value: "all", label: "All categories" },
  { value: "trousers", label: "Trousers" },
  { value: "shirts", label: "Shirts" },
  { value: "tshirts", label: "T-Shirts" },
  { value: "hoodies", label: "Hoodies" },
  { value: "jackets", label: "Jackets & Coats" },
  { value: "jeans", label: "Jeans" },
];

interface ProductWithMeta {
  id: number;
  name: string;
  description: string | null;
  price: string;
  category: string;
  images: string[];
  isVisible: boolean;
  totalStock: number;
  stockBySize?: Record<string, number>;
  categoryLabel: string;
  colorLabel: string;
}

interface ProductsTableProps {
  products: ProductWithMeta[];
  initialQuery?: string;
  initialCategory?: string;
}

export function ProductsTable({
  products,
  initialQuery = "",
  initialCategory = "all",
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    if (category && category !== "all") params.set("category", category);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("category", value);
    else params.delete("category");
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteProduct(id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-xs"
        />
        <Button onClick={handleSearch} variant="default">
          Search
        </Button>
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-md overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground w-10">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Product
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Stock
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Price
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Color
              </th>
              <th className="text-left px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="text-right px-4 py-3 font-medium uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-2 text-center text-muted-foreground"
                >
                  No products found
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  className="border-t border-border hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 shrink-0 bg-muted overflow-hidden rounded">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
                            —
                          </div>
                        )}
                      </div>
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{product.categoryLabel}</td>
                  <td className="overflow-visible px-4 py-3">
                    <StockHoverCell
                      totalStock={product.totalStock}
                      stockBySize={product.stockBySize ?? {}}
                    />
                  </td>
                  <td className="px-4 py-3">
                    ${typeof product.price === "string" ? product.price : String(product.price)}
                  </td>
                  <td className="px-4 py-3">{product.colorLabel}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        product.isVisible
                          ? "bg-muted text-foreground"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {product.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-foreground hover:underline mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id, product.name)}
                      className="text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
