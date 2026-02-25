"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { StreamCard } from "@/components/stream/stream-card";
import { Tag, Radio, Loader2 } from "lucide-react";

interface Stream {
  id: string;
  title: string;
  viewerCount: number;
  tags: string[];
  isLive: boolean;
  thumbnailUrl: string | null;
  user: {
    username: string;
    name: string | null;
    image: string | null;
  };
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = use(params);
  const decodedTag = decodeURIComponent(tag);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/streams/category/${encodeURIComponent(decodedTag)}`);
        if (res.ok) {
          const data = await res.json();
          setStreams(data.streams);
        }
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }
    load();
  }, [decodedTag]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{decodedTag}</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading..." : `${streams.length} live stream${streams.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/"
            className="ml-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Browse all
          </Link>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : streams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
            <Radio className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No live streams</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No one is streaming <span className="text-primary">{decodedTag}</span> right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                id={stream.id}
                title={stream.title}
                streamerName={stream.user.name || stream.user.username}
                streamerUsername={stream.user.username}
                streamerAvatar={stream.user.image ?? undefined}
                viewerCount={stream.viewerCount}
                tags={stream.tags}
                isLive={stream.isLive}
                thumbnailUrl={stream.thumbnailUrl ?? undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
