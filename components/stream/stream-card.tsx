"use client";

import Link from "next/link";
import { Users, Radio } from "lucide-react";
import { formatViewerCount } from "@/lib/utils";

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
  return (
    <Link href={`/watch/${id}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-secondary">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Radio className="h-12 w-12 text-muted-foreground/30" />
            </div>
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
    </Link>
  );
}
