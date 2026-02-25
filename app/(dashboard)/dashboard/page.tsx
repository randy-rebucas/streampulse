"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Radio,
  Users,
  BarChart3,
  Settings,
  Calendar,
  ExternalLink,
  TrendingUp,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface StreamSummary {
  id: string;
  title: string;
  isLive: boolean;
  peakViewers: number;
  viewerCount: number;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
}

interface ScheduledItem {
  id: string;
  title: string;
  scheduledAt: string;
  tags: string[];
}

interface DashboardData {
  totalStreams: number;
  totalPeakViewers: number;
  followerCount: number;
  liveStream: StreamSummary | null;
  recentStreams: StreamSummary[];
  scheduled: ScheduledItem[];
}

function StatCard({
  icon,
  label,
  value,
  loading,
  accent = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  loading: boolean;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg bg-${accent}/10 p-2.5`}>{icon}</div>
        <div>
          {loading ? (
            <div className="h-7 w-12 animate-pulse rounded bg-secondary" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const username = (session?.user as any)?.username as string | undefined;

  const [data, setData] = useState<DashboardData>({
    totalStreams: 0,
    totalPeakViewers: 0,
    followerCount: 0,
    liveStream: null,
    recentStreams: [],
    scheduled: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function load() {
      try {
        const [streamsRes, scheduledRes, followRes] = await Promise.all([
          fetch(`/api/streams?userId=${session!.user!.id}`),
          fetch("/api/streams/schedule"),
          username ? fetch(`/api/follow/${username}`) : Promise.resolve(null),
        ]);

        const streamsData = streamsRes.ok ? await streamsRes.json() : { streams: [] };
        const scheduledData = scheduledRes.ok ? await scheduledRes.json() : { schedules: [] };
        const followData = followRes?.ok ? await followRes.json() : { followerCount: 0 };

        const streams: StreamSummary[] = streamsData.streams ?? [];
        const liveStream = streams.find((s) => s.isLive) ?? null;
        const pastStreams = streams
          .filter((s) => !s.isLive)
          .sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime())
          .slice(0, 5);

        setData({
          totalStreams: streams.length,
          totalPeakViewers: streams.reduce((sum, s) => sum + (s.peakViewers ?? 0), 0),
          followerCount: followData.followerCount ?? 0,
          liveStream,
          recentStreams: pastStreams,
          scheduled: (scheduledData.schedules ?? []).slice(0, 3),
        });
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [session?.user?.id, username]);

  const displayName = session?.user?.name || username || "Streamer";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back,{" "}
            <span className="text-primary">{displayName}</span>
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your channel</p>
        </div>
        {username && (
          <Link
            href={`/u/${username}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View profile
          </Link>
        )}
      </div>

      {/* Live banner */}
      {data.liveStream && (
        <Link
          href={`/watch/${data.liveStream.id}`}
          target="_blank"
          className="flex items-center justify-between gap-4 rounded-xl border border-live/40 bg-live/5 px-5 py-4 transition-colors hover:bg-live/10"
        >
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-live animate-pulse-live" />
            <div>
              <p className="font-semibold text-live">You're live now</p>
              <p className="text-sm text-muted-foreground">{data.liveStream.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{data.liveStream.viewerCount} watching</span>
            </div>
            <ExternalLink className="h-4 w-4 text-live" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Radio className="h-5 w-5 text-primary" />}
          label="Total Streams"
          value={data.totalStreams}
          loading={loading}
          accent="primary"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-live" />}
          label="All-Time Peak Viewers"
          value={data.totalPeakViewers.toLocaleString()}
          loading={loading}
          accent="live"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-violet-400" />}
          label="Followers"
          value={data.followerCount.toLocaleString()}
          loading={loading}
          accent="violet-400"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/dashboard/stream",
              icon: <Radio className="h-5 w-5 text-live" />,
              bg: "bg-live/10",
              label: "Go Live",
              desc: "Start broadcasting",
            },
            {
              href: "/dashboard/analytics",
              icon: <BarChart3 className="h-5 w-5 text-primary" />,
              bg: "bg-primary/10",
              label: "Analytics",
              desc: "Summaries & charts",
            },
            {
              href: "/dashboard/stream",
              icon: <Calendar className="h-5 w-5 text-violet-400" />,
              bg: "bg-violet-400/10",
              label: "Schedule",
              desc: "Plan a stream",
            },
            {
              href: "/dashboard/settings",
              icon: <Settings className="h-5 w-5 text-muted-foreground" />,
              bg: "bg-secondary",
              label: "Settings",
              desc: "Profile & stream key",
            },
          ].map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
            >
              <div className={`shrink-0 rounded-lg ${item.bg} p-2.5`}>{item.icon}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {item.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom section: recent streams + scheduled */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent streams */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Streams
            </h2>
            <Link href="/dashboard/analytics" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : data.recentStreams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Radio className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No streams yet</p>
                <Link
                  href="/dashboard/stream"
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Go live now →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.recentStreams.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(s.endedAt ?? s.startedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {s.peakViewers} peak
                        </span>
                      </div>
                    </div>
                    {s.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Scheduled streams */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Upcoming Scheduled
            </h2>
            <Link href="/dashboard/stream" className="text-xs text-primary hover:underline">
              Add new
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : data.scheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                <Link
                  href="/dashboard/stream"
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Schedule a stream →
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {data.scheduled.map((s) => {
                  const dt = new Date(s.scheduledAt);
                  return (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="shrink-0 rounded-lg bg-violet-400/10 px-2 py-1.5 text-center min-w-[3rem]">
                        <p className="text-[10px] font-semibold text-violet-400 uppercase">
                          {dt.toLocaleDateString("en", { month: "short" })}
                        </p>
                        <p className="text-base font-bold leading-none text-violet-400">
                          {dt.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {dt.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
