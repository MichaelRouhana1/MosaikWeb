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
import { ImageCropModal } from "@/components/ImageCropModal";
import { cn } from "@/lib/utils";
import type { ProductCategory } from "@/actions/categories";

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

interface ColorEntry {
  id: string;
  name: string;
  hexCode: string;
  imageFiles: File[];
  stockBySize: Record<string, number>;
}

export function CreateProductForm({ categories }: { categories: ProductCategory[] }) {
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
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
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
              <ColorRow
                key={color.id}
                color={color}
                sizes={SIZES}
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

interface ColorRowProps {
  color: ColorEntry;
  sizes: readonly string[];
  onUpdate: (updates: Partial<Omit<ColorEntry, "id">>) => void;
  onRemove: () => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  canRemove: boolean;
}

function ColorRow({
  color,
  onUpdate,
  onRemove,
  onAddFiles,
  onRemoveFile,
  canRemove,
}: ColorRowProps) {
  const [cropPending, setCropPending] = useState<{ file: File; objectUrl: string } | null>(null);
  const cropQueueRef = useRef<File[]>([]);

  const processNextInQueue = useCallback(() => {
    const next = cropQueueRef.current.shift();
    if (!next) {
      setCropPending(null);
      return;
    }
    setCropPending({ file: next, objectUrl: URL.createObjectURL(next) });
  }, []);

  const handleCropComplete = useCallback(
    (blob: Blob) => {
      const current = cropPending;
      if (!current) return;
      URL.revokeObjectURL(current.objectUrl);
      setCropPending(null);
      const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
      onAddFiles([file]);
      processNextInQueue();
    },
    [cropPending, onAddFiles, processNextInQueue]
  );

  const handleCropCancel = useCallback(() => {
    if (cropPending) {
      URL.revokeObjectURL(cropPending.objectUrl);
      setCropPending(null);
    }
    processNextInQueue();
  }, [cropPending, processNextInQueue]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      cropQueueRef.current.push(...acceptedFiles);
      if (!cropPending) processNextInQueue();
    },
    [cropPending, processNextInQueue]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Color name</Label>
            <Input
              placeholder="e.g. Midnight Black"
              value={color.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hex code</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color.hexCode}
                onChange={(e) => onUpdate({ hexCode: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <Input
                value={color.hexCode}
                onChange={(e) => onUpdate({ hexCode: e.target.value })}
                placeholder="#000000"
                className="font-mono"
              />
            </div>
          </div>
        </div>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-destructive hover:text-destructive">
            Remove
          </Button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Images (this color only)</Label>
        <div
          {...getRootProps()}
          className={cn(
            "border-input flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <p className="text-center text-sm text-muted-foreground">
            {isDragActive ? "Drop images here…" : "Drag & drop or click to add images"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP, GIF up to 5MB</p>
        </div>
        {color.imageFiles.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {color.imageFiles.map((file, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
              >
                {file.name}
                <button
                  type="button"
                  onClick={() => onRemoveFile(i)}
                  className="text-destructive hover:underline"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {cropPending && (
        <ImageCropModal
          imageSrc={cropPending.objectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={2 / 3}
          title="Crop image (2:3 product ratio)"
        />
      )}
    </div>
  );
}
