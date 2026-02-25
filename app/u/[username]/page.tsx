"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import {
  Users,
  Radio,
  Calendar,
  Tag,
  Loader2,
  UserPlus,
  UserCheck,
  AlertCircle,
  CalendarDays,
  Clock,
  Play,
  Youtube,
  ListVideo,
  ExternalLink,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  followerCount: number;
  isFollowing: boolean;
  isLive: boolean;
  liveStreamId: string | null;
  pastStreams: Array<{
    id: string;
    title: string;
    peakViewers: number;
    tags: string[];
    endedAt: string | null;
  }>;
  scheduled: Array<{
    id: string;
    title: string;
    description: string;
    scheduledAt: string;
    tags: string[];
  }>;
  watchPartyQueue: string[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

function fmtScheduled(iso: string): { month: string; day: string; time: string } {
  const d = new Date(iso);
  return {
    month: d.toLocaleDateString("en", { month: "short" }),
    day: String(d.getDate()),
    time: d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/user/${username}`);
        if (!res.ok) { setError("User not found"); return; }
        const data = await res.json();
        setProfile(data);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  const handleFollow = async () => {
    if (!profile || !session) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${username}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) =>
          p ? { ...p, isFollowing: data.following, followerCount: data.followerCount } : p
        );
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">User Not Found</h1>
          <p className="text-muted-foreground">{error || "This user doesn't exist."}</p>
          <Link href="/" className="mt-2 text-sm text-primary hover:underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = (session?.user as any)?.username === profile.username;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero banner */}
      <div className="h-32 w-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent sm:h-44" />

      <div className="mx-auto max-w-4xl px-4">
        {/* Profile header — overlaps banner */}
        <div className="-mt-12 mb-8 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.image}
                alt={profile.name ?? profile.username}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-background sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-background sm:h-28 sm:w-28">
                {(profile.name ?? profile.username)[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + actions row */}
          <div className="flex flex-1 flex-col gap-3 pb-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold leading-tight">
                  {profile.name ?? profile.username}
                </h1>
                {profile.isLive && (
                  <Link
                    href={`/watch/${profile.liveStreamId}`}
                    className="flex items-center gap-1.5 rounded-md bg-live/10 px-2.5 py-1 text-xs font-bold text-live hover:bg-live/20 transition-colors"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                    LIVE NOW
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {profile.isLive && (
                <Link
                  href={`/watch/${profile.liveStreamId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-live px-4 py-2 text-sm font-semibold text-white hover:bg-live/90 transition-colors shadow-sm shadow-live/20"
                >
                  <Play className="h-3.5 w-3.5" />
                  Watch Live
                </Link>
              )}
              {session && !isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                    profile.isFollowing
                      ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {followLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : profile.isFollowing ? (
                    <UserCheck className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {profile.isFollowing ? "Following" : "Follow"}
                </button>
              )}
              {isOwnProfile && (
                <Link
                  href="/dashboard/settings"
                  className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats + bio row */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          {profile.bio && (
            <p className="flex-1 text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
          )}
          <div className="flex shrink-0 items-center gap-5 sm:flex-col sm:items-end sm:gap-2">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{profile.followerCount.toLocaleString()}</span>
              <span className="text-muted-foreground">followers</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Radio className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold tabular-nums">{profile.pastStreams.length}</span>
              <span className="text-muted-foreground">streams</span>
            </div>
          </div>
        </div>

        {/* YouTube Watch Party Queue */}
        {profile.watchPartyQueue.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Youtube className="h-4 w-4 text-red-500" />
              Watch Party Playlist
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({profile.watchPartyQueue.length})
              </span>
              <Link
                href={`/watch-party/${profile.username}`}
                className="ml-auto flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Play className="h-3 w-3" />
                Watch Together
              </Link>
            </h2>

            {/* Horizontal scrollable thumbnail row */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {profile.watchPartyQueue.map((videoId, i) => (
                <a
                  key={`${videoId}-${i}`}
                  href={`https://youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative shrink-0 w-40 rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="relative aspect-video w-full bg-black">
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                      alt={`Video ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Play className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity" />
                    </div>
                    {/* Index badge */}
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-px text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                    <span className="truncate text-[10px] text-muted-foreground">youtu.be/{videoId}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />
                  </div>
                </a>
              ))}

              {/* Watch together CTA card */}
              <Link
                href={`/watch-party/${profile.username}`}
                className="group flex shrink-0 w-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 hover:border-primary/40 hover:bg-primary/5 transition-colors aspect-video px-3 py-4"
              >
                <ListVideo className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                <span className="text-center text-[10px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  Watch party room
                </span>
              </Link>
            </div>
          </section>
        )}

        {/* Scheduled streams */}
        {profile.scheduled.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Upcoming Streams
            </h2>
            <div className="space-y-2">
              {profile.scheduled.map((s) => {
                const dt = fmtScheduled(s.scheduledAt);
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    {/* Date block */}
                    <div className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-center min-w-[3rem]">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-primary">{dt.month}</p>
                      <p className="text-lg font-bold leading-none text-primary">{dt.day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.title}</p>
                      {s.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.description}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {dt.time}
                        </span>
                        {s.tags.map((t) => (
                          <Link
                            key={t}
                            href={`/category/${encodeURIComponent(t)}`}
                            className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          >
                            {t}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Past streams */}
        <section className="pb-12">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Radio className="h-4 w-4 text-primary" />
            Past Streams
            {profile.pastStreams.length > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({profile.pastStreams.length})
              </span>
            )}
          </h2>
          {profile.pastStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14">
              <Radio className="h-10 w-10 text-muted-foreground/25" />
              <p className="mt-3 text-sm font-medium">No past streams yet</p>
              {isOwnProfile && (
                <Link href="/dashboard/stream" className="mt-2 text-xs text-primary hover:underline underline-offset-4">
                  Go live now
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.pastStreams.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-xl border border-border bg-card p-4 hover:border-border/80 hover:bg-card/80 transition-colors"
                >
                  <p className="mb-2 font-medium line-clamp-1">{s.title}</p>
                  {s.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <Link
                          key={t}
                          href={`/category/${encodeURIComponent(t)}`}
                          className="flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {t}
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {s.peakViewers} peak
                    </span>
                    {s.endedAt && <span>{timeAgo(s.endedAt)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
