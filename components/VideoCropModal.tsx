"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

/** Extract a frame from video as data URL for crop preview. */
async function getVideoFrameUrl(videoUrl: string, seekTo = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = seekTo;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => reject(new Error("Video load failed"));
    video.src = videoUrl;
  });
}

/** Ensure value is even for ffmpeg crop filter compatibility. */
function toEven(n: number): number {
  return Math.floor(n / 2) * 2;
}

/** Crop video using ffmpeg.wasm. */
async function cropVideoWithFFmpeg(
  videoFile: File,
  crop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  const ext = videoFile.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputName = `input.${ext}`;
  const outputName = "output.mp4";

  await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

  const x = toEven(Math.max(0, crop.x));
  const y = toEven(Math.max(0, crop.y));
  const w = toEven(Math.max(2, crop.width));
  const h = toEven(Math.max(2, crop.height));

  await ffmpeg.exec(["-i", inputName, "-vf", `crop=${w}:${h}:${x}:${y}`, outputName]);

  const data = await ffmpeg.readFile(outputName);
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new Blob([data as BlobPart], { type: "video/mp4" });
}

interface VideoCropModalProps {
  videoFile: File;
  videoObjectUrl: string;
  onComplete: (blob: Blob) => void;
  onCancel: () => void;
  /** Aspect ratio for crop (e.g. 4/5 for video display). */
  aspect?: number;
  title?: string;
}

export function VideoCropModal({
  videoFile,
  videoObjectUrl,
  onComplete,
  onCancel,
  aspect = 4 / 5,
  title = "Crop video (matches home page display)",
}: VideoCropModalProps) {
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    getVideoFrameUrl(videoObjectUrl)
      .then(setFrameUrl)
      .catch((err) => setFrameError(err instanceof Error ? err.message : "Failed to load frame"));
  }, [videoObjectUrl]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await cropVideoWithFFmpeg(videoFile, {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      });
      onComplete(blob);
    } catch (err) {
      console.error("Video crop failed:", err);
      setFrameError(err instanceof Error ? err.message : "Crop failed");
    } finally {
      setProcessing(false);
    }
  };

  if (frameError) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-background max-w-md p-6 rounded-lg border border-border">
          <p className="text-sm text-destructive mb-4">{frameError}</p>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs uppercase border border-border hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!frameUrl) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-background p-6 rounded-lg">Loading video frame…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background w-full max-w-6xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider">{title}</h3>
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
            image={frameUrl}
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
