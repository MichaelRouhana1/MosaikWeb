"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";


function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedBlob(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/jpeg", 0.9);
  });
}

interface ImageCropModalProps {
  imageSrc: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
  /** Aspect ratio for crop (e.g. 16/9 for 16:9). Default 2/3 for product cards. */
  aspect?: number;
  /** Title shown in the modal header. */
  title?: string;
}

export function ImageCropModal({
  imageSrc,
  onComplete,
  onCancel,
  aspect = 2 / 3,
  title = "Crop image (2:3 product card ratio)",
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      onComplete(blob);
    } catch (err) {
      console.error("Crop failed:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider">
            {title}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs uppercase border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="px-4 py-2 text-xs uppercase bg-foreground text-background disabled:opacity-50"
            >
              {processing ? "Processing…" : "Confirm"}
            </button>
          </div>
        </div>
        <div className="relative flex-1 min-h-[500px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            zoomSpeed={0.1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropAreaChange={onCropComplete}
            objectFit="contain"
          />
        </div>
      </div>
    </div>
  );
}
