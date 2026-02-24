"use client";

import { useEffect, useRef, useCallback, useState, use } from "react";
import { Loader2, AlertCircle, Youtube } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
    _ytReadyCallbacks: Array<() => void>;
  }
}

function ensureYTApiLoaded(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (!window._ytReadyCallbacks) window._ytReadyCallbacks = [];
  if (window.YT?.Player) { onReady(); return; }
  window._ytReadyCallbacks.push(onReady);
  if (!document.getElementById("yt-iframe-api")) {
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      (window._ytReadyCallbacks ?? []).forEach((cb) => cb());
      window._ytReadyCallbacks = [];
    };
  }
}

interface HostInfo {
  username: string;
  name: string | null;
  image: string | null;
}

export default function WatchPartyPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  // Param reused as username slug (URL: /watch-party/[username])
  const { streamId: username } = use(params);

  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [host, setHost] = useState<HostInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/watch-party/${username}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setQueue(data.queue ?? []);
        setHost(data.user);
      })
      .catch(() => setError("Failed to load watch party"))
      .finally(() => setLoading(false));
  }, [username]);

  const loadVideo = useCallback((videoId: string) => {
    if (!containerRef.current) return;
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    const div = document.createElement("div");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(div);
    playerRef.current = new window.YT.Player(div, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
      events: {
        onStateChange: (event: { data: number }) => {
          // YT.PlayerState.ENDED === 0 → advance to next, loop
          if (event.data === 0) setIndex((prev) => prev + 1);
        },
      },
    });
  }, []);

  // Wrap index to loop
  useEffect(() => {
    if (!queue.length) return;
    const wrapped = index % queue.length;
    if (index !== wrapped) setIndex(wrapped);
  }, [index, queue.length]);

  // Load video on index/queue change
  useEffect(() => {
    if (!queue.length) return;
    const videoId = queue[index % queue.length];
    ensureYTApiLoaded(() => loadVideo(videoId));
  }, [queue, index, loadVideo]);

  useEffect(() => () => { playerRef.current?.destroy(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">Watch Party Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <Youtube className="h-12 w-12 text-muted-foreground/30" />
          <h1 className="text-xl font-bold">No videos queued</h1>
          <p className="text-muted-foreground">
            {host?.name ?? host?.username ?? username} hasn&apos;t added any videos yet.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = index % queue.length;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Navbar />

      {/* Full-viewport YouTube player */}
      <div className="relative flex-1">
        <div ref={containerRef} className="h-[calc(100vh-3.5rem)] w-full" />

        {/* Overlay: host info + progress */}
        <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3">
          {host?.image ? (
            <img
              src={host.image}
              alt={host.name ?? host.username}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-white/20">
              {(host?.name ?? host?.username ?? username)[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-white drop-shadow">
              {host?.name ?? host?.username ?? username}&apos;s Watch Party
            </p>
            <p className="text-xs text-white/60 drop-shadow">
              {currentIndex + 1} / {queue.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
