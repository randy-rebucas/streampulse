"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Radio } from "lucide-react";
import Hls from "hls.js";
import { formatViewerCount } from "@/lib/utils";

function getHlsUrl(streamId: string) {
  const ws = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL ?? "";
  const http = ws.replace(/^wss?:\/\//, "https://");
  return `${http}/hls/${streamId}/index.m3u8`;
}

interface StreamCardProps {
  id: string;
  title: string;
  streamerName: string;
  streamerUsername?: string;
  streamerAvatar?: string;
  viewerCount: number;
  tags: string[];
  isLive: boolean;
  thumbnailUrl?: string;
}

export function StreamCard({
  id,
  title,
  streamerName,
  streamerUsername,
  streamerAvatar,
  viewerCount,
  tags,
  isLive,
  thumbnailUrl,
}: StreamCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [videoActive, setVideoActive] = useState(false);
  const [liveThumbnail, setLiveThumbnail] = useState<string | null>(null);

  // Silently capture first HLS frame as a static thumbnail for live streams
  useEffect(() => {
    if (!isLive || thumbnailUrl) return;
    const src = getHlsUrl(id);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    let hls: Hls | null = null;
    let done = false;

    const capture = () => {
      if (done) return;
      done = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext("2d");
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setLiveThumbnail(canvas.toDataURL("image/jpeg", 0.75));
        }
      } catch {
        // tainted canvas (CORS) — silently skip
      }
      video.pause();
      hls?.destroy();
    };

    video.addEventListener("timeupdate", capture, { once: true });

    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, startLevel: 0, maxBufferLength: 2 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.once(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) { done = true; hls?.destroy(); } });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
    }

    return () => { done = true; hls?.destroy(); video.pause(); };
  }, [id, isLive, thumbnailUrl]);

  const displayThumbnail = thumbnailUrl || liveThumbnail;

  const startPreview = useCallback(() => {
    if (!isLive) return;
    const video = videoRef.current;
    if (!video) return;
    const src = getHlsUrl(id);
    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, startLevel: -1 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setVideoActive(true);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) { hls.destroy(); hlsRef.current = null; }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      setVideoActive(true);
    }
  }, [id, isLive]);

  const stopPreview = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    const video = videoRef.current;
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    setVideoActive(false);
  }, []);

  return (
    <div
      className="group block cursor-pointer"
      onClick={() => router.push(`/watch/${id}`)}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        {/* Thumbnail / Video preview */}
        <div className="relative aspect-video bg-secondary">
          {displayThumbnail ? (
            <img
              src={displayThumbnail}
              alt={title}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                videoActive ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div
              className={`flex h-full items-center justify-center transition-opacity duration-300 ${
                videoActive ? "opacity-0" : "opacity-100"
              }`}
            >
              <Radio className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Live HLS preview video */}
          {isLive && (
            <video
              ref={videoRef}
              muted
              playsInline
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                videoActive ? "opacity-100" : "opacity-0"
              }`}
            />
          )}

          {/* Live badge */}
          {isLive && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-live px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-live" />
              <span className="text-xs font-bold text-white">LIVE</span>
            </div>
          )}

          {/* Viewer count */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5">
            <Users className="h-3 w-3 text-white" />
            <span className="text-xs text-white">
              {formatViewerCount(viewerCount)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex gap-3">
            {/* Avatar — links to streamer profile */}
            {streamerUsername ? (
              <Link
                href={`/u/${streamerUsername}`}
                onClick={(e) => e.stopPropagation()}
                className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
              >
                {streamerAvatar ? (
                  <img src={streamerAvatar} alt={streamerName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{streamerName.charAt(0).toUpperCase()}</span>
                )}
              </Link>
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {streamerAvatar ? (
                  <img src={streamerAvatar} alt={streamerName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">{streamerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
              {streamerUsername ? (
                <Link
                  href={`/u/${streamerUsername}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  {streamerName}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground">{streamerName}</p>
              )}
              {/* Tags — each links to category browse */}
              {tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag) => (
                    <Link
                      key={tag}
                      href={`/category/${encodeURIComponent(tag)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
