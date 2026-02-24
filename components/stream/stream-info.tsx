"use client";

import { Users } from "lucide-react";
import { formatViewerCount } from "@/lib/utils";

interface StreamInfoProps {
  title: string;
  streamerName: string;
  streamerAvatar?: string;
  viewerCount: number;
  tags: string[];
  isLive: boolean;
}

export function StreamInfo({
  title,
  streamerName,
  streamerAvatar,
  viewerCount,
  tags,
  isLive,
}: StreamInfoProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      {/* Avatar */}
      <div className="relative h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
        {streamerAvatar ? (
          <img
            src={streamerAvatar}
            alt={streamerName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-primary">
            {streamerName.charAt(0).toUpperCase()}
          </span>
        )}
        {isLive && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-live" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
        <p className="text-sm text-muted-foreground">{streamerName}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{formatViewerCount(viewerCount)} viewers</span>
          </div>
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
