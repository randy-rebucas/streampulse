"use client";

import { useEffect, useState } from "react";
import { Radio, Sparkles, Shield, Bot, TrendingUp, Users, BarChart3, Smile } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { StreamCard } from "@/components/stream/stream-card";

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

export default function HomePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStreams() {
      try {
        const res = await fetch("/api/streams?live=true");
        if (res.ok) {
          const data = await res.json();
          setStreams(data.streams);
        }
      } catch (e) {
        console.error("Failed to load streams:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStreams();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                AI-Powered Streaming
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Stream Live.{" "}
              <span className="text-primary">Chat Smart.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              The live streaming platform with AI-powered chat moderation,
              emoji reactions, live polls, follow system, and automatic stream summaries.
            </p>

            {/* Feature pills */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <Shield className="h-4 w-4 text-success" />
                <span className="text-sm">AI Moderation</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-sm">Smart Chatbot</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-sm">Stream Summaries</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <Smile className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">Live Reactions</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span className="text-sm">Live Polls</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2">
                <Users className="h-4 w-4 text-pink-400" />
                <span className="text-sm">Follow Streamers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Streams */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-live" />
            <h2 className="text-xl font-bold">Live Now</h2>
          </div>
          {streams.length > 0 && (
            <span className="rounded-full bg-live/10 px-2.5 py-0.5 text-xs font-medium text-live">
              {streams.length} streams
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-xl bg-secondary" />
                <div className="mt-3 flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 rounded bg-secondary" />
                    <div className="mt-1.5 h-3 w-1/2 rounded bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : streams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                id={stream.id}
                title={stream.title}
                streamerName={stream.user.name || stream.user.username}
                streamerUsername={stream.user.username}
                streamerAvatar={stream.user.image || undefined}
                viewerCount={stream.viewerCount}
                tags={stream.tags}
                isLive={stream.isLive}
                thumbnailUrl={stream.thumbnailUrl || undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
            <Radio className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No live streams right now
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to go live! Head to your dashboard to start streaming.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
