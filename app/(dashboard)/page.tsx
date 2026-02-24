"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Radio, Users, MessageSquare, BarChart3 } from "lucide-react";
import Link from "next/link";

interface StreamStats {
  totalStreams: number;
  totalViewers: number;
  totalMessages: number;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<StreamStats>({
    totalStreams: 0,
    totalViewers: 0,
    totalMessages: 0,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.firstName || "Streamer"}
        </h1>
        <p className="text-muted-foreground">
          Manage your streams and view analytics
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalStreams}</p>
              <p className="text-sm text-muted-foreground">Total Streams</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2.5">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalViewers}</p>
              <p className="text-sm text-muted-foreground">Peak Viewers</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2.5">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMessages}</p>
              <p className="text-sm text-muted-foreground">Chat Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/stream"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="rounded-xl bg-live/10 p-3">
            <Radio className="h-6 w-6 text-live" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              Go Live
            </h3>
            <p className="text-sm text-muted-foreground">
              Start streaming to your audience
            </p>
          </div>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div className="rounded-xl bg-primary/10 p-3">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              View Analytics
            </h3>
            <p className="text-sm text-muted-foreground">
              Stream summaries and insights
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
