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
  ThumbsUp,
  Loader2,
  Activity,
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
    highlights: Array<{
      timestamp: string;
      description: string;
      type: string;
    }>;
    sentiment: string;
  } | null;
  _count: {
    chatMessages: number;
  };
}

/** Minimal SVG polyline chart for viewer count over time */
function ViewerHistoryChart({ data }: { data: Array<{ t: string; count: number }> }) {
  if (data.length < 2) return null;
  const W = 320;
  const H = 64;
  const pad = 4;
  const maxV = Math.max(...data.map((d) => d.count), 1);
  const points = data
    .map((d, i) => {
      const x = pad + ((W - pad * 2) * i) / (data.length - 1);
      const y = H - pad - ((H - pad * 2) * d.count) / maxV;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="px-4 pb-3">
      <p className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Activity className="h-3 w-3" />
        Viewer history
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible rounded"
        style={{ height: 64 }}
      >
        {/* Area fill */}
        <polygon
          points={`${pad},${H - pad} ${points} ${W - pad},${H - pad}`}
          fill="rgba(139,92,246,0.12)"
        />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Peak dot */}
        {(() => {
          const peak = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
          const idx = data.indexOf(peak);
          const x = pad + ((W - pad * 2) * idx) / (data.length - 1);
          const y = H - pad - ((H - pad * 2) * peak.count) / maxV;
          return <circle cx={x} cy={y} r={3} fill="#8b5cf6" />;
        })()}
      </svg>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [streams, setStreams] = useState<StreamWithSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStreams() {
      try {
        const res = await fetch("/api/streams");
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground">
          View your stream performance and AI-generated summaries
        </p>
      </div>

      {/* Stream list with summaries */}
      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <Radio className="h-12 w-12 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold">No streams yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start your first stream to see analytics here
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Stream header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-3">
                  {stream.isLive ? (
                    <div className="flex items-center gap-1.5 rounded bg-live/10 px-2 py-1">
                      <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
                      <span className="text-xs font-bold text-live">LIVE</span>
                    </div>
                  ) : (
                    <div className="rounded bg-secondary px-2 py-1">
                      <span className="text-xs text-muted-foreground">Ended</span>
                    </div>
                  )}
                  <h3 className="font-semibold">{stream.title}</h3>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Peak: {stream.peakViewers}
                  </span>
                  {stream.startedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(stream.startedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {stream.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
                  {stream.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Viewer history chart */}
              {stream.viewerHistory?.length > 1 && (
                <div className="border-b border-border">
                  <ViewerHistoryChart data={stream.viewerHistory} />
                </div>
              )}

              {/* AI Summary */}
              {stream.summary ? (
                <StreamSummaryCard summary={stream.summary} />
              ) : (
                <div className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    AI summary will be generated when the stream ends with
                    enough chat activity
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
