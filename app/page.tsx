"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Radio, Sparkles, Shield, Bot, TrendingUp, Users,
  BarChart3, Smile, Youtube, ChevronRight, Zap,
  MessageSquare, MonitorPlay, ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { StreamCard } from "@/components/stream/stream-card";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0];
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

interface WatchPartyItem {
  videoUrl: string;
  isLive: boolean;
  streamId: string | null;
  user: { username: string; name: string | null; image: string | null };
}

interface Stream {
  id: string;
  title: string;
  viewerCount: number;
  tags: string[];
  isLive: boolean;
  thumbnailUrl: string | null;
  user: { username: string; name: string | null; image: string | null };
}

const FEATURE_CARDS = [
  {
    icon: Shield,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    title: "AI Moderation",
    desc: "Every message is screened by OpenAI before it appears. Hate speech, spam, and harassment are blocked automatically.",
  },
  {
    icon: Bot,
    color: "text-primary",
    bg: "bg-primary/10",
    title: "Smart Chatbot",
    desc: "Mention @bot in chat to get contextual AI responses. Viewers get answers without leaving the stream.",
  },
  {
    icon: TrendingUp,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    title: "Auto Summaries",
    desc: "When your stream ends, an AI summary is generated — key topics, highlights, and sentiment analysis.",
  },
  {
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    title: "Live Polls",
    desc: "Launch polls mid-stream. Viewers vote in real time and see live percentage bars update instantly.",
  },
  {
    icon: Smile,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    title: "Reactions",
    desc: "Emoji bursts float over the video when viewers react — keeps energy high without cluttering chat.",
  },
  {
    icon: Youtube,
    color: "text-red-400",
    bg: "bg-red-400/10",
    title: "Watch Parties",
    desc: "Queue YouTube videos and watch together in sync. Every viewer sees the same video at the same time.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    desc: "Sign up in seconds — email/password, GitHub, or Google. No credit card needed.",
  },
  {
    step: "02",
    title: "Go live from the dashboard",
    desc: "Copy your stream key into OBS, click Go Live in the dashboard, and you're on air.",
  },
  {
    step: "03",
    title: "Engage your audience",
    desc: "Chat, polls, reactions, and an AI chatbot keep your community active and entertained.",
  },
];

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-video rounded-xl bg-secondary" />
      <div className="mt-3 flex gap-3">
        <div className="h-9 w-9 rounded-full bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-secondary" />
          <div className="h-3 w-1/2 rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [watchParties, setWatchParties] = useState<WatchPartyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      try {
        const [liveRes, wpRes] = await Promise.all([
          fetch("/api/streams?live=true"),
          fetch("/api/watch-parties"),
        ]);
        if (liveRes.ok) {
          const d = await liveRes.json();
          setStreams(d.streams ?? []);
        }
        if (wpRes.ok) {
          const d = await wpRes.json();
          setWatchParties(d.items ?? []);
        }
      } catch (e) {
        console.error("Failed to load streams:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStreams();
  }, []);

  const totalViewers = streams.reduce((sum, s) => sum + s.viewerCount, 0);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    streams.forEach((s) => s.tags?.forEach((t) => set.add(t)));
    return Array.from(set).slice(0, 10);
  }, [streams]);

  const filteredStreams = activeTag
    ? streams.filter((s) => s.tags?.includes(activeTag))
    : streams;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-16 right-1/4 h-64 w-64 rounded-full bg-violet-500/8 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Live Streaming</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Stream Live.{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Chat Smart.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            The live streaming platform with built-in AI moderation, an intelligent chatbot,
            live polls, emoji reactions, watch parties, and automatic post-stream summaries.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {session ? (
              <Link
                href="/dashboard/stream"
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5"
              >
                <Radio className="h-4 w-4" />
                Go Live Now
              </Link>
            ) : (
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5"
              >
                <Zap className="h-4 w-4" />
                Start Streaming — Free
              </Link>
            )}
            <a
              href="#live"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <MonitorPlay className="h-4 w-4" />
              Browse Live Streams
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>

          {!loading && streams.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full border border-live/30 bg-live/10 px-3 py-1 text-xs font-medium text-live">
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
                {streams.length} live now
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {totalViewers.toLocaleString()} watching
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Live Streams */}
      <section id="live" className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-live" />
            <h2 className="text-xl font-bold">Live Now</h2>
          </div>
          {streams.length > 0 && (
            <span className="rounded-full bg-live/10 px-2.5 py-0.5 text-xs font-medium text-live">
              {streams.length} stream{streams.length !== 1 ? "s" : ""}
            </span>
          )}
          {allTags.length > 0 && (
            <div className="ml-auto flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTag(null)}
                className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                  !activeTag
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium transition-colors ${
                    activeTag === tag
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredStreams.map((stream) => (
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
            <Radio className="h-12 w-12 text-muted-foreground/20" />
            <h3 className="mt-4 text-lg font-semibold">No live streams right now</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Be the first to go live! Head to your dashboard to start streaming.
            </p>
            <Link
              href={session ? "/dashboard/stream" : "/sign-up"}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Radio className="h-3.5 w-3.5" />
              {session ? "Go Live" : "Get Started"}
            </Link>
          </div>
        )}
      </section>

      {/* Watch Party callout */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-8 sm:px-10">
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-red-500/5 blur-2xl" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <Youtube className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Watch Parties</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Queue up YouTube videos and watch together in sync. Chat, react, and vote on polls — all while the same video plays for everyone.
                </p>
              </div>
            </div>
            <Link
              href={session ? "/dashboard/watch-party" : "/sign-up"}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-secondary px-5 py-2.5 text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              Host a Watch Party
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Watch Party Videos */}
      {!loading && watchParties.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10">
          <div className="mb-5 flex items-center gap-3">
            <Youtube className="h-5 w-5 text-red-400" />
            <h2 className="text-xl font-bold">Watch Party Queues</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {watchParties.map((item, i) => {
              const vid = getYouTubeId(item.videoUrl);
              const thumb = vid
                ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
                : null;
              const href = item.isLive && item.streamId
                ? `/watch-party/${item.streamId}`
                : `/u/${item.user.username}`;
              return (
                <Link
                  key={`${item.user.username}-${i}`}
                  href={href}
                  className="group block overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/5"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-secondary">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt="Watch party video"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Youtube className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* YouTube play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90">
                        <svg className="h-5 w-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {item.isLive && (
                      <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-live px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-live" />
                        <span className="text-xs font-bold text-white">LIVE</span>
                      </div>
                    )}
                  </div>
                  {/* Host info */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {item.user.image ? (
                        <img src={item.user.image} alt={item.user.name ?? item.user.username} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {(item.user.name ?? item.user.username).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold group-hover:text-red-400 transition-colors">
                        {item.user.name ?? item.user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">@{item.user.username}</p>
                    </div>
                    <Youtube className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Get started in minutes</h2>
            <p className="mt-2 text-muted-foreground">No complicated setup. Stream live in three steps.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="mb-4 block text-4xl font-black text-primary/20">{step.step}</span>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="mt-2 text-muted-foreground">Built-in tools so you can focus on streaming, not tooling.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map(({ icon: Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — only shown to signed-out users */}
      {!session && (
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-medium text-primary">Join the community</span>
            </div>
            <h2 className="text-4xl font-bold">Ready to go live?</h2>
            <p className="mt-3 text-muted-foreground">
              Create a free account and start streaming in minutes. Bring your own OBS setup — we handle everything else.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5"
              >
                <Zap className="h-4 w-4" />
                Create free account
              </Link>
              <Link
                href="/sign-in"
                className="rounded-xl border border-border bg-card px-8 py-3 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
