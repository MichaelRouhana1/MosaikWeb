"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { VideoCropModal } from "@/components/VideoCropModal";
import { addHomeVideoFromFile, deleteHomeVideo } from "@/actions/video";
import { Button } from "@/components/ui/button";
import { VideoMuteToggle } from "@/components/VideoMuteToggle";
import type { HomeVideo } from "@/db/schema";

/** Matches VideoMuteToggle: aspect-[4/5] */
const VIDEO_ASPECT = 4 / 5;

interface VideoAdminClientProps {
  video: HomeVideo | null;
  initialStoreType: "streetwear" | "formal";
}

export function VideoAdminClient({ video: initialVideo, initialStoreType }: VideoAdminClientProps) {
  const router = useRouter();
  const [video, setVideo] = useState<HomeVideo | null>(initialVideo);
  const [cropFile, setCropFile] = useState<{ file: File; objectUrl: string } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const cropFileRef = useRef<{ file: File; objectUrl: string } | null>(null);
  cropFileRef.current = cropFile;

  useEffect(() => {
    setVideo(initialVideo);
  }, [initialVideo]);

  const handleCropComplete = useCallback(
    async (blob: Blob) => {
      const current = cropFileRef.current;
      if (!current) return;
      URL.revokeObjectURL(current.objectUrl);
      setCropFile(null);

      const file = new File([blob], current.file.name.replace(/\.[^.]+$/, ".mp4"), {
        type: "video/mp4",
      });

      setIsAdding(true);
      const formData = new FormData();
      formData.append("video", file);
      formData.append("storeType", initialStoreType);
      const result = await addHomeVideoFromFile(formData);
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length >= 1) {
      const file = acceptedFiles[0];
      const url = URL.createObjectURL(file);
      setCropFile({ file, objectUrl: url });
    }
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      setDeletingId(id);
      await deleteHomeVideo(id);
      setVideo(null);
      setDeletingId(null);
      router.refresh();
    },
    [router]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".webm"] },
    maxSize: 100 * 1024 * 1024,
    maxFiles: 1,
    disabled: !!cropFile || isAdding,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Home Page Video</h1>
          <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-full capitalize">
            Managing: {initialStoreType}
          </span>
        </div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button
            type="button"
            disabled={!!cropFile || isAdding}
            className="cursor-pointer"
          >
            {isAdding ? "Uploading…" : "Add Video"}
          </Button>
        </div>
      </div>

      {!video ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
          <p className="mb-4">No items found for this store. Add your first <span className="capitalize">{initialStoreType}</span> item.</p>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <Button variant="outline" type="button" className="cursor-pointer">
              Upload your first video
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-md">
          <div className="relative group overflow-hidden rounded-lg border border-border bg-muted">
            <div className="aspect-[4/5] relative">
              <VideoMuteToggle videoSrc={video.videoUrl} className="w-full h-full" />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(video.id)}
                disabled={deletingId === video.id}
              >
                {deletingId === video.id ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {cropFile && (
        <VideoCropModal
          videoFile={cropFile.file}
          videoObjectUrl={cropFile.objectUrl}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={VIDEO_ASPECT}
          title="Crop video (matches home page display)"
        />
      )}
    </div>
  );
}
