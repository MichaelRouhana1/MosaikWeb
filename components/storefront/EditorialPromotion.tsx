import { VideoMuteToggle } from "@/components/VideoMuteToggle";

export function EditorialPromotion({ videoUrl }: { videoUrl?: string }) {
    return (
        <section className="w-full bg-muted py-24">
            <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <p className="text-lg font-normal text-foreground leading-relaxed max-w-[32ch]">
                        Two pieces. Thoughtfully paired.
                        <br />
                        Designed to work together.
                    </p>
                </div>
                <VideoMuteToggle
                    videoSrc={videoUrl ?? "/images/copy_1FA36497-0DD6-4C57-B22C-B21E1C628908.MOV"}
                    className="max-h-[70vh]"
                />
            </div>
        </section>
    );
}
