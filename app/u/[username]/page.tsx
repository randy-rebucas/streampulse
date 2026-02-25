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
        if (!res.ok) {
          setError("User not found");
          return;
        }
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Profile header */}
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt={profile.name ?? profile.username}
              className="h-24 w-24 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
              {(profile.name ?? profile.username)[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold">{profile.name ?? profile.username}</h1>
              {profile.isLive && (
                <Link
                  href={`/watch/${profile.liveStreamId}`}
                  className="flex items-center gap-1.5 rounded bg-live/10 px-2.5 py-1 text-xs font-bold text-live hover:bg-live/20 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
                  LIVE
                </Link>
              )}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="mb-4 text-sm text-foreground/80 max-w-lg">{profile.bio}</p>
            )}

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{profile.followerCount.toLocaleString()}</span>
                <span className="text-muted-foreground">followers</span>
              </div>

              {session && session.user?.name !== profile.username && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                    profile.isFollowing
                      ? "bg-secondary text-foreground hover:bg-secondary/80"
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
            </div>
          </div>
        </div>

        {/* Scheduled streams */}
        {profile.scheduled.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Streams
            </h2>
            <div className="space-y-2">
              {profile.scheduled.map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{s.title}</p>
                    {s.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
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
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(s.scheduledAt).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Past streams */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Radio className="h-4 w-4 text-primary" />
            Past Streams
          </h2>
          {profile.pastStreams.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
              <Radio className="h-10 w-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm text-muted-foreground">No past streams yet</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.pastStreams.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="mb-2 font-medium line-clamp-1">{s.title}</p>
                  <div className="mb-2.5 flex flex-wrap gap-1">
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Peak {s.peakViewers}
                    </span>
                    {s.endedAt && (
                      <span>{new Date(s.endedAt).toLocaleDateString()}</span>
                    )}
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
