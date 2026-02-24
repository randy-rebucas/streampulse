"use client";

import { Youtube } from "lucide-react";
import { useChatStore } from "@/stores/chat-store";

export function YouTubeWatchParty() {
  const youtubeVideoId = useChatStore((s) => s.youtubeVideoId);

  if (!youtubeVideoId) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Youtube className="h-4 w-4 text-red-600" />
        <span className="text-sm font-semibold">Watch Party</span>
        <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
          ● Live
        </span>
      </div>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          title="Watch Party"
        />
      </div>
    </div>
  );
}
