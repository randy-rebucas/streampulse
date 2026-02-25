"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { formatViewerCount } from "@/lib/utils";

interface StreamInfoProps {
  title: string;
  streamerName: string;
  streamerUsername?: string;
  streamerAvatar?: string;
  viewerCount: number;
  tags: string[];
  isLive: boolean;
}

export function StreamInfo({
  title,
  streamerName,
  streamerUsername,
  streamerAvatar,
  viewerCount,
  tags,
  isLive,
}: StreamInfoProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      {/* Avatar */}
      {streamerUsername ? (
        <Link href={`/u/${streamerUsername}`} className="shrink-0">
          <div className="relative h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
            {streamerAvatar ? (
              <img src={streamerAvatar} alt={streamerName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-primary">{streamerName.charAt(0).toUpperCase()}</span>
            )}
            {isLive && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-live" />
            )}
          </div>
        </Link>
      ) : (
        <div className="relative h-10 w-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {streamerAvatar ? (
            <img src={streamerAvatar} alt={streamerName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">{streamerName.charAt(0).toUpperCase()}</span>
          )}
          {isLive && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-live" />
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
        {streamerUsername ? (
          <Link href={`/u/${streamerUsername}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            {streamerName}
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">{streamerName}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{formatViewerCount(viewerCount)} viewers</span>
          </div>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/category/${encodeURIComponent(tag)}`}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
