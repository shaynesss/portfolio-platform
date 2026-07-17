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
    <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
      {/* Images whose aspect ratio doesn't match the card would either
          crop (object-cover) or letterbox with hard empty bars
          (object-contain alone) — instead, a blurred cover-fit copy
          fills the frame behind a sharp, uncropped contain-fit copy on
          top, so nothing gets cut off and there's no dead space.
          crossOrigin must match the 3D card face's texture loader
          (ProjectCardScene) for the same URL — otherwise whichever
          fetches first (no-cors here vs. cors there) can leave a
          cached response the other mode can't reuse, silently
          breaking the texture. */}
      <img
        aria-hidden
        src={url}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
      />
      <img
        src={url}
        alt=""
        crossOrigin="anonymous"
        className="relative h-full w-full object-contain"
      />
    </div>
  );
}
