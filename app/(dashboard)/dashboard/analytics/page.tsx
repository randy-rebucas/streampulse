"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  Radio,
  Users,
  Clock,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Loader2,
  Activity,
  Wand2,
  CalendarDays,
} from "lucide-react";
import { StreamSummaryCard } from "@/components/dashboard/stream-summary-card";

interface StreamWithSummary {
  id: string;
  title: string;
  isLive: boolean;
  viewerCount: number;
  peakViewers: number;
  startedAt: string | null;
  endedAt: string | null;
  tags: string[];
  viewerHistory: Array<{ t: string; count: number }>;
  summary: {
    title: string;
    tldr: string;
    keyTopics: string[];
    highlights: Array<{ timestamp: string; description: string; type: string }>;
    sentiment: string;
  } | null;
  _count: { chatMessages: number };
}

function fmtDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return "—";
  const end = endedAt ? new Date(endedAt) : new Date();
  const mins = Math.round((end.getTime() - new Date(startedAt).getTime()) / 60_000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

/** SVG sparkline with area fill, grid lines, and peak annotation */
function ViewerHistoryChart({ data }: { data: Array<{ t: string; count: number }> }) {
  if (data.length < 2) return null;
  const W = 400;
  const H = 72;
  const padX = 4;
  const padY = 8;
  const maxV = Math.max(...data.map((d) => d.count), 1);

  const toXY = (i: number, count: number) => ({
    x: padX + ((W - padX * 2) * i) / (data.length - 1),
    y: H - padY - ((H - padY * 2) * count) / maxV,
  });

  const pts = data.map((d, i) => toXY(i, d.count));
  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${padX},${H - padY} ${polyline} ${W - padX},${H - padY}`;

  const peakIdx = data.reduce((best, d, i) => (d.count > data[best].count ? i : best), 0);
  const peak = pts[peakIdx];

  return (
    <div className="px-4 pb-3 pt-1">
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        <Activity className="h-3 w-3" />
        Viewer history
        <span className="ml-auto text-[10px]">peak: {data[peakIdx].count}</span>
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded" style={{ height: 72 }}>
        {/* Horizontal grid */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={padX} y1={H - padY - (H - padY * 2) * f}
            x2={W - padX} y2={H - padY - (H - padY * 2) * f}
            stroke="currentColor" strokeOpacity={0.06} strokeWidth={1}
          />
        ))}
        {/* Area */}
        <polygon points={area} fill="rgba(139,92,246,0.10)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Peak dot + label */}
        <circle cx={peak.x} cy={peak.y} r={3.5} fill="#8b5cf6" />
      </svg>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="h-5 w-12 rounded bg-secondary" />
        <div className="h-4 w-48 rounded bg-secondary" />
        <div className="ml-auto h-4 w-32 rounded bg-secondary" />
      </div>
      <div className="grid grid-cols-3 gap-px border-b border-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3">
            <div className="h-3 w-16 rounded bg-secondary" />
            <div className="mt-1 h-5 w-10 rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="h-20 bg-secondary/30" />
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<StreamWithSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadStreams() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/streams?userId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          // newest first
          setStreams(
            [...(data.streams as StreamWithSummary[])].sort(
              (a, b) =>
                new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime()
            )
          );
        }
      } catch (e) {
        console.error("Failed to load streams:", e);
      } finally {
        setLoading(false);
      }
    }
    if (session?.user?.id) loadStreams();
    else if (session !== undefined) setLoading(false);
  }, [session]);

  const handleGenerateSummary = async (streamId: string) => {
    setGeneratingId(streamId);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        setStreams((prev) => prev.map((s) => (s.id === streamId ? { ...s, summary } : s)));
      }
    } catch (e) {
      console.error("Failed to generate summary:", e);
    } finally {
      setGeneratingId(null);
    }
  };

  /* ── Aggregate stats ─────────────────────────────────────── */
  const totalStreams = streams.length;
  const allTimePeak = streams.reduce((m, s) => Math.max(m, s.peakViewers), 0);
  const totalMessages = streams.reduce((m, s) => m + (s._count?.chatMessages ?? 0), 0);
  const pastStreams = streams.filter((s) => !s.isLive && s.startedAt && s.endedAt);
  const avgMins =
    pastStreams.length > 0
      ? Math.round(
          pastStreams.reduce((sum, s) => {
            const mins =
              (new Date(s.endedAt!).getTime() - new Date(s.startedAt!).getTime()) / 60_000;
            return sum + mins;
          }, 0) / pastStreams.length
        )
      : 0;

  const statCards = [
    { label: "Total Streams", value: totalStreams, icon: Radio, color: "text-primary" },
    { label: "All-time Peak", value: allTimePeak, icon: TrendingUp, color: "text-live" },
    { label: "Chat Messages", value: totalMessages.toLocaleString(), icon: MessageSquare, color: "text-blue-400" },
    {
      label: "Avg Duration",
      value: avgMins >= 60 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : avgMins ? `${avgMins}m` : "—",
      icon: Clock,
      color: "text-amber-400",
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Your stream performance &amp; AI summaries</p>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
              <div className="h-3 w-20 rounded bg-secondary" />
              <div className="mt-2 h-6 w-12 rounded bg-secondary" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Your stream performance &amp; AI summaries</p>
      </div>

      {/* Aggregate stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              {label}
            </div>
            <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Stream list */}
      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Radio className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">No streams yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Start your first stream to see analytics here</p>
        </div>
      ) : (
        <div className="space-y-5">
          {streams.map((stream) => {
            const duration = fmtDuration(stream.startedAt, stream.endedAt);
            const chatCount = stream._count?.chatMessages ?? 0;
            return (
              <div key={stream.id} className="overflow-hidden rounded-xl border border-border bg-card">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      {stream.isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-live/10 px-2 py-0.5 text-xs font-bold text-live">
                          <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                          LIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          Ended
                        </span>
                      )}
                      {stream.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="truncate font-semibold">{stream.title}</h3>
                    {stream.startedAt && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        {fmtDate(stream.startedAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-border border-t border-b border-border">
                  <div className="flex flex-col items-center py-3">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Users className="h-3 w-3 text-live" />
                      Peak Viewers
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">{stream.peakViewers}</p>
                  </div>
                  <div className="flex flex-col items-center py-3">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MessageSquare className="h-3 w-3 text-blue-400" />
                      Chat Messages
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">{chatCount.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-center py-3">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3 text-amber-400" />
                      Duration
                    </div>
                    <p className="mt-1 text-xl font-bold tabular-nums">{duration}</p>
                  </div>
                </div>

                {/* Viewer history chart */}
                {stream.viewerHistory?.length > 1 && (
                  <div className="border-b border-border">
                    <ViewerHistoryChart data={stream.viewerHistory} />
                  </div>
                )}

                {/* AI Summary */}
                {stream.summary ? (
                  <StreamSummaryCard summary={stream.summary} />
                ) : !stream.isLive ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      No AI summary yet
                    </div>
                    <button
                      onClick={() => handleGenerateSummary(stream.id)}
                      disabled={generatingId === stream.id}
                      className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-60"
                    >
                      {generatingId === stream.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5" />
                      )}
                      {generatingId === stream.id ? "Generating…" : "Generate AI Summary"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI summary will be available after stream ends
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
