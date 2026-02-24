"use client";

import { useEffect, useRef } from "react";
import { Youtube } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
    _ytReadyCallbacks: Array<() => void>;
  }
}

/**
 * Loads the YouTube IFrame API once and fires all registered callbacks when ready.
 */
function ensureYTApiLoaded(onReady: () => void) {
  if (typeof window === "undefined") return;

  if (!window._ytReadyCallbacks) window._ytReadyCallbacks = [];

  if (window.YT?.Player) {
    onReady();
    return;
  }

  window._ytReadyCallbacks.push(onReady);

  if (!document.getElementById("yt-iframe-api")) {
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    // The API calls window.onYouTubeIframeAPIReady when ready
    window.onYouTubeIframeAPIReady = () => {
      (window._ytReadyCallbacks ?? []).forEach((cb) => cb());
      window._ytReadyCallbacks = [];
    };
  }
}

interface YouTubeQueuePlayerProps {
  /**
   * Called when the current video ends, after the store has already advanced.
   * Streamer passes this to re-broadcast the new index.
   */
  onVideoEnd?: (newIndex: number, queue: string[]) => void;
  /** Placeholder shown while no video is queued */
  emptyLabel?: string;
}

export function YouTubeQueuePlayer({
  onVideoEnd,
  emptyLabel = "Waiting for host to start the watch party...",
}: YouTubeQueuePlayerProps) {
  const youtubeVideoId = useChatStore((s) => s.youtubeVideoId);
  const advanceYoutubeQueue = useChatStore((s) => s.advanceYoutubeQueue);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!youtubeVideoId) {
      // Destroy stale player if queue is cleared
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }

    const createPlayer = () => {
      if (!containerRef.current) return;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      // Fresh mount target
      const div = document.createElement("div");
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(div);

      playerRef.current = new window.YT.Player(div, {
        width: "100%",
        height: "100%",
        videoId: youtubeVideoId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onStateChange: (event: { data: number }) => {
            // YT.PlayerState.ENDED === 0
            if (event.data === 0) {
              advanceYoutubeQueue();
              const { youtubeQueueIndex: newIndex, youtubeQueue } =
                useChatStore.getState();
              onVideoEnd?.(newIndex, youtubeQueue);
            }
          },
        },
      });
    };

    ensureYTApiLoaded(createPlayer);

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [youtubeVideoId, advanceYoutubeQueue, onVideoEnd]);

  if (!youtubeVideoId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-secondary">
        <Youtube className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
