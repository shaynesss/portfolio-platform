import type { DemoMediaType, VideoSource } from "@/lib/api";

interface DemoMediaProps {
  type: DemoMediaType;
  url: string;
  videoSource: VideoSource;
}

export default function DemoMedia({ type, url, videoSource }: DemoMediaProps) {
  if (type === "video" && videoSource === "youtube") {
    return (
      <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900">
        <iframe
          src={url}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900">
        <video src={url} className="h-full w-full object-cover" controls />
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg bg-zinc-900">
      <img src={url} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
