"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { ImageCropModal } from "@/components/ImageCropModal";
import { addHeroImageFromFile, deleteHeroImage } from "@/actions/hero";
import { Button } from "@/components/ui/button";
import type { HeroImage } from "@/db/schema";

/** Matches hero carousel: width / 75vh. From user's viewport ~1567×544: aspect ≈ 2.88. Use 72/25 ≈ 2.88 */
const HERO_ASPECT = 72 / 25;

interface HeroAdminClientProps {
  images: HeroImage[];
}

export function HeroAdminClient({ images: initialImages }: HeroAdminClientProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cropFileRef = useRef<{ file: File; objectUrl: string } | null>(null);
  cropFileRef.current = cropFile;

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length >= 1) {
      const file = acceptedFiles[0];
      const url = URL.createObjectURL(file);
      setCropFile({ file, objectUrl: url });
    }
  }, []);

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);

      const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });

      setIsAdding(true);
      const formData = new FormData();
      formData.append("image", file);
      const result = await addHeroImageFromFile(formData);
      setIsAdding(false);

      if (result.error) {
        console.error(result.error);
        return;
      }
      router.refresh();
    },
    [router]
  );

  const handleCropCancel = useCallback(() => {
    const current = cropFileRef.current;
    if (current) {
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id);
      await deleteHeroImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      setDeletingId(null);
      router.refresh();
    },
    [router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: !!cropFile || isAdding,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hero Slideshow</h1>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button
            type="button"
            disabled={!!cropFile || isAdding}
            className="cursor-pointer"
          >
            {isAdding ? "Adding…" : "Add Slide"}
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
          <p className="mb-4">No hero images yet.</p>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" type="button" className="cursor-pointer">
              Add your first slide
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="aspect-[16/9] relative">
                <Image
                  src={img.imageUrl}
                  alt={img.altText ?? "Hero slide"}
                  fill
                  className="object-cover"
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                >
                  {deletingId === img.id ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cropFile && (
        <ImageCropModal
          imageSrc={cropFile.objectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={HERO_ASPECT}
          title="Crop hero image (matches hero display)"
        />
      )}
    </div>
  );
}
