"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateProduct } from "@/actions/updateProduct";
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
import type { Product, ProductVariant } from "@/db/schema";

const CATEGORIES = [
  { value: "trousers", label: "Trousers" },
  { value: "shirts", label: "Shirts" },
  { value: "tshirts", label: "T-Shirts" },
  { value: "hoodies", label: "Hoodies" },
  { value: "jackets", label: "Jackets & Coats" },
  { value: "jeans", label: "Jeans" },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

export function EditProductForm({
  product,
  variants = [],
}: {
  product: Product;
  variants?: ProductVariant[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [stock, setStock] = useState<Record<string, number>>(() =>
    SIZES.reduce<Record<string, number>>((acc, size) => {
      const v = variants.find((x) => x.size === size);
      acc[size] = v?.stock ?? 0;
      return acc;
    }, {})
  );
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 1) {
      const file = acceptedFiles[0];
      const url = URL.createObjectURL(file);
      setCropFile({ file, objectUrl: url });
    } else if (acceptedFiles.length > 1) {
      setFiles((prev) => [...prev, ...acceptedFiles]);
    }
  }, []);

  const cropFileRef = useRef<{ file: File; objectUrl: string } | null>(null);
  cropFileRef.current = cropFile;

  const handleCropComplete = useCallback((blob: Blob) => {
    const current = cropFileRef.current;
    if (!current) return;
    URL.revokeObjectURL(current.objectUrl);
    const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
    setFiles((prev) => [...prev, file]);
    setCropFile(null);
  }, []);

  const handleCropCancel = useCallback(() => {
    const current = cropFileRef.current;
    if (current) {
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    maxSize: 5 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formRef.current) return;
    setIsPending(true);
    setState(null);
    const formData = new FormData(formRef.current);
    files.forEach((file) => formData.append("images", file));
    SIZES.forEach((size) => formData.append(`stock_${size}`, String(stock[size] ?? 0)));
    const result = await updateProduct(product.id, formData);
    setState(result);
    setIsPending(false);
    if (!result.error) {
      router.push("/admin/products");
      router.refresh();
    }
  }

  const price = typeof product.price === "string" ? product.price : String(product.price);

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit product</CardTitle>
          <CardDescription>Update product details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Product name"
              defaultValue={product.name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Product description"
              defaultValue={product.description ?? ""}
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
                defaultValue={price}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                required
                defaultValue={product.categorySlug ?? "trousers"}
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              name="color"
              placeholder="e.g. Black, Navy, White"
              defaultValue={product.color ?? ""}
            />
          </div>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium mb-1">Sizes & inventory</h3>
              <p className="text-xs text-muted-foreground">
                Set stock for each size. Use 0 if not stocked.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              {SIZES.map((size) => (
                <div key={size} className="space-y-1.5 min-w-[80px]">
                  <Label htmlFor={`stock_${size}`} className="text-xs">
                    {size}
                  </Label>
                  <Input
                    id={`stock_${size}`}
                    type="number"
                    min={0}
                    value={stock[size] ?? 0}
                    onChange={(e) =>
                      setStock((prev) => ({
                        ...prev,
                        [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                      }))
                    }
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isVisible"
              name="isVisible"
              value="true"
              defaultChecked={product.isVisible}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isVisible" className="font-normal">
              Visible in store
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Images</Label>
            {product.images && product.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {product.images.map((url, i) => (
                  <div
                    key={i}
                    className="relative w-20 h-20 rounded overflow-hidden bg-muted shrink-0"
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
            <div
              {...getRootProps()}
              className={cn(
                "border-input flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-4 transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <p className="text-center text-sm text-muted-foreground">
                {isDragActive
                  ? "Drop images here..."
                  : "Drag & drop to add more images, or click to select"}
              </p>
            </div>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded bg-muted px-2 py-1 text-sm"
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {cropFile && (
            <ImageCropModal
              imageSrc={cropFile.objectUrl}
              onComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          )}
          <div className="flex gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/products")}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
