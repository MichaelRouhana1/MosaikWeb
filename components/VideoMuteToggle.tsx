"use client";

import { useState } from "react";
import { VolumeX, Volume2 } from "lucide-react";

interface VideoMuteToggleProps {
  videoSrc: string;
  className?: string;
}

export function VideoMuteToggle({ videoSrc, className }: VideoMuteToggleProps) {
  const [muted, setMuted] = useState(true);

  return (
    <div
      className={`aspect-[4/5] overflow-hidden cursor-pointer relative group/video ${className ?? ""}`}
      onClick={() => setMuted((m) => !m)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && setMuted((m) => !m)}
      aria-label={muted ? "Unmute video" : "Mute video"}
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted={muted}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
        {muted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </div>
    </div>
  );
}
