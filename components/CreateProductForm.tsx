"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { createProduct } from "@/actions/createProduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategorySelect } from "@/components/admin/CategorySelect";
import { PriceInput } from "@/components/admin/PriceInput";
import { StoreTypeSelect } from "@/components/admin/StoreTypeSelect";
import { ImageUploadSection, type ColorEntry } from "@/components/admin/ImageUploadSection";
import type { ProductCategory } from "@/actions/categories";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export function CreateProductForm({
  categories,
  initialStoreType = "streetwear"
}: {
  categories: ProductCategory[];
  initialStoreType?: "streetwear" | "formal" | "both";
}) {
  const router = useRouter();
  const [colors, setColors] = useState<ColorEntry[]>([]);
  const [state, setState] = useState<{ error?: string; productId?: number } | null>(null);
  const [isPending, setIsPending] = useState(false);

  const addColor = () => {
    setColors((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        hexCode: "#000000",
        imageFiles: [],
        stockBySize: Object.fromEntries(SIZES.map((s) => [s, 0])),
      },
    ]);
  };

  const removeColor = (id: string) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
  };

  const updateColor = (id: string, updates: Partial<Omit<ColorEntry, "id">>) => {
    setColors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addFilesToColor = (id: string, files: File[]) => {
    setColors((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, imageFiles: [...c.imageFiles, ...files] } : c
      )
    );
  };

  const removeFileFromColor = (colorId: string, fileIndex: number) => {
    setColors((prev) =>
      prev.map((c) =>
        c.id === colorId
          ? { ...c, imageFiles: c.imageFiles.filter((_, i) => i !== fileIndex) }
          : c
      )
    );
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form) return;

    if (colors.length === 0) {
      setState({ error: "Add at least one color" });
      return;
    }

    const invalidColors = colors.filter((c) => !c.name.trim());
    if (invalidColors.length > 0) {
      setState({ error: "Each color must have a name" });
      return;
    }

    setIsPending(true);
    setState(null);

    const formData = new FormData(form);
    formData.set("color_count", String(colors.length));
    colors.forEach((color, i) => {
      formData.set(`color_${i}_name`, color.name.trim());
      formData.set(`color_${i}_hex`, color.hexCode || "#000000");
      color.imageFiles.forEach((file) => {
        formData.append(`color_${i}_images`, file);
      });
      SIZES.forEach((size) => {
        formData.set(`color_${i}_stock_${size}`, String(color.stockBySize[size] ?? 0));
      });
    });

    const result = await createProduct(formData);
    setState(result);
    setIsPending(false);
    if (result.productId) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  if (state?.productId) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Product details</CardTitle>
          <CardDescription>Add a new product to your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Product name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Product description"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PriceInput />
            <CategorySelect categories={categories} />
            <StoreTypeSelect initialStoreType={initialStoreType} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              name="isVisible"
              value="true"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="font-normal">
              Visible in store
            </Label>
          </div>

          {/* Color Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Colors</h3>
                <p className="text-xs text-muted-foreground">
                  Add colors with their own images and stock levels
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addColor}>
                Add color
              </Button>
            </div>

            {colors.map((color) => (
              <ImageUploadSection
                key={color.id}
                color={color}
                onUpdate={(updates) => updateColor(color.id, updates)}
                onRemove={() => removeColor(color.id)}
                onAddFiles={(files) => addFilesToColor(color.id, files)}
                onRemoveFile={(idx) => removeFileFromColor(color.id, idx)}
                canRemove={colors.length > 1}
              />
            ))}

            {colors.length === 0 && (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No colors added yet. Add at least one color to continue.
                </p>
                <Button type="button" variant="outline" onClick={addColor}>
                  Add first color
                </Button>
              </div>
            )}
          </div>

          {/* Variant Matrix - shown when colors exist */}
          {colors.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Stock by color & size</h3>
                <p className="text-xs text-muted-foreground">
                  Set inventory for each color and size combination
                </p>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Color</th>
                      {SIZES.map((s) => (
                        <th key={s} className="p-3 font-medium text-center">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((color) => (
                      <tr key={color.id} className="border-t border-border">
                        <td className="p-3 font-medium">{color.name || "—"}</td>
                        {SIZES.map((size) => (
                          <td key={size} className="p-2">
                            <Input
                              type="number"
                              min={0}
                              value={color.stockBySize[size] ?? 0}
                              onChange={(e) =>
                                updateColor(color.id, {
                                  stockBySize: {
                                    ...color.stockBySize,
                                    [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  },
                                })
                              }
                              className="h-8 w-16 text-center"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex gap-4">
            <Button type="submit" disabled={isPending || colors.length === 0}>
              {isPending ? "Creating…" : "Create product"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}


