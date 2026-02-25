"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { LiveKitRoom, useRoomContext } from "@livekit/components-react";
import {
  Loader2, AlertCircle, UserPlus, UserCheck,
  Mic, MicOff, Video, VideoOff,
  MessageSquare, X, Users,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { StreamPlayer } from "@/components/stream/stream-player";
import { StreamInfo } from "@/components/stream/stream-info";
import { ChatPanel } from "@/components/chat/chat-panel";
import { YouTubeSync } from "@/components/stream/youtube-sync";
import { YouTubeQueuePlayer } from "@/components/stream/youtube-queue-player";
import { useChatStore } from "@/stores/chat-store";

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👏", "😮", "🎉"];

/** Mic/camera controls for a guest co-streamer — rendered inside <LiveKitRoom> */
function GuestControls() {
  const room = useRoomContext();
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const toggleMic = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn((v) => !v);
    } catch (e) {
      console.error("Failed to toggle mic:", e);
    }
  };

  const toggleCam = async () => {
    try {
      await room.localParticipant.setCameraEnabled(!camOn);
      setCamOn((v) => !v);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
      <span className="mr-1 text-xs font-medium text-primary">Co-Streamer</span>
      <button
        onClick={toggleMic}
        title={micOn ? "Mute" : "Unmute"}
        className={`rounded-lg p-2 transition-colors ${
          micOn ? "bg-secondary text-foreground" : "bg-destructive/20 text-destructive"
        }`}
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </button>
      <button
        onClick={toggleCam}
        title={camOn ? "Camera off" : "Camera on"}
        className={`rounded-lg p-2 transition-colors ${
          camOn ? "bg-secondary text-foreground" : "bg-destructive/20 text-destructive"
        }`}
      >
        {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Rendered inside <LiveKitRoom> — can use useRoomContext safely */
function MobileReactionBar() {
  const room = useRoomContext();
  const { addReaction } = useChatStore();

  const handleReact = (emoji: string) => {
    addReaction(emoji);
    if (!room) return;
    const encoder = new TextEncoder();
    room.localParticipant.publishData(
      encoder.encode(JSON.stringify({ type: "reaction", emoji })),
      { reliable: true }
    );
  };

  return (
    <div className="flex items-center justify-center gap-1.5 py-2 lg:hidden">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          className="rounded-xl border border-border bg-secondary/60 px-2.5 py-1.5 text-xl hover:bg-secondary hover:scale-110 transition-all active:scale-95"
          aria-label={`React ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  isLive: boolean;
  viewerCount: number;
  tags: string[];
  watchPartyQueue?: string[] | null;
  watchPartyQueueIndex?: number | null;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
  };
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const guestTokenParam = searchParams?.get("guestToken");
  const isSignedIn = !!session;
  const [stream, setStream] = useState<StreamData | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const setYoutubeVideoId = useChatStore((s) => s.setYoutubeVideoId);
  const setYoutubeQueue = useChatStore((s) => s.setYoutubeQueue);
  const youtubeVideoId = useChatStore((s) => s.youtubeVideoId);
  const reactions = useChatStore((s) => s.reactions);
  const removeReaction = useChatStore((s) => s.removeReaction);

  useEffect(() => {
    async function loadStream() {
      try {
        const res = await fetch(`/api/streams/${streamId}`);
        if (!res.ok) {
          setError("Stream not found");
          return;
        }

        const data = await res.json();
        setStream(data.stream);

        // Load follow status
        if (isSignedIn) {
          fetch(`/api/follow/${data.stream.user.username}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) { setIsFollowing(d.isFollowing); setFollowerCount(d.followerCount); }
            })
            .catch(() => {});
        }

        // Seed watch party state for late joiners
        if (data.stream.watchPartyQueue?.length) {
          setYoutubeQueue(
            data.stream.watchPartyQueue,
            data.stream.watchPartyQueueIndex ?? 0
          );
        }

        if (guestTokenParam) {
          // Guest co-streamer: use the publisher token embedded in the URL
          setToken(guestTokenParam);
        } else if (isSignedIn) {
          const tokenRes = await fetch("/api/livekit/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName: streamId, isStreamer: false }),
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setToken(tokenData.token);
          }
        }
      } catch (e) {
        console.error("Failed to load stream:", e);
        setError("Failed to load stream");
      } finally {
        setLoading(false);
      }
    }

    loadStream();
  }, [streamId, isSignedIn, guestTokenParam, setYoutubeQueue]);

  const handleFollow = useCallback(async () => {
    if (!stream || !session) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${stream.user.username}`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setIsFollowing(d.following);
        setFollowerCount(d.followerCount);
      }
    } finally {
      setFollowLoading(false);
    }
  }, [stream, session]);

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

  if (error || !stream) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">Stream Not Found</h1>
          <p className="text-muted-foreground">
            {error || "This stream doesn't exist or has ended."}
          </p>
          <Link href="/" className="mt-2 text-sm text-primary hover:underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || "";
  const isStreamer = !!session && (session.user as any)?.id === stream.user.id;

  // Main content area — shared between authenticated and unauthenticated views
  const mainContent = (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl p-4">
        {/* Video player — with reactions overlay */}
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          {youtubeVideoId ? (
            <YouTubeQueuePlayer />
          ) : token && stream.isLive ? (
            <StreamPlayer streamerIdentity={stream.user.id} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-secondary">
              {token && !stream.isLive ? (
                <>
                  <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Waiting for stream to start…</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Sign in to watch this stream</p>
                  <Link
                    href="/sign-in"
                    className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Floating reaction particles */}
          {reactions.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute bottom-8 text-3xl animate-reaction-float"
              style={{ left: `${r.x}%` }}
              onAnimationEnd={() => removeReaction(r.id)}
            >
              {r.emoji}
            </span>
          ))}
        </div>

        <StreamInfo
          title={stream.title}
          streamerName={stream.user.name || stream.user.username}
          streamerUsername={stream.user.username}
          streamerAvatar={stream.user.image || undefined}
          viewerCount={stream.viewerCount}
          tags={stream.tags}
          isLive={stream.isLive}
        />

        {/* Mobile reaction bar — only inside LiveKitRoom (token required) */}
        {token && isSignedIn && <MobileReactionBar />}

        {/* Guest co-streamer controls */}
        {guestTokenParam && (
          <div className="px-4 pb-2">
            <GuestControls />
          </div>
        )}

        {/* Follow / follower row */}
        {isSignedIn && !isStreamer && (
          <div className="mt-1 flex items-center gap-3 px-4 pb-3">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                isFollowing
                  ? "border border-border bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {followLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isFollowing ? (
                <UserCheck className="h-3.5 w-3.5" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              {isFollowing ? "Following" : "Follow"}
            </button>
            {followerCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                {followerCount.toLocaleString()} followers
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {token ? (
          // Single LiveKitRoom — shares one WebSocket for video, chat, and YouTube sync
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            className="flex flex-1 overflow-hidden"
          >
            {/* Always-mounted: handles YouTube data channel events (including mobile) */}
            <YouTubeSync />

            {mainContent}

            {/* Chat sidebar — desktop */}
            <div className="hidden w-80 shrink-0 border-l border-border lg:flex lg:flex-col">
              <ChatPanel streamId={streamId} isStreamer={isStreamer} />
            </div>

            {/* Mobile chat toggle FAB */}
            <button
              onClick={() => setMobileChatOpen((v) => !v)}
              className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg lg:hidden"
            >
              {mobileChatOpen ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              {mobileChatOpen ? "Close" : "Chat"}
            </button>

            {/* Mobile chat bottom sheet */}
            {mobileChatOpen && (
              <div className="fixed inset-x-0 bottom-0 z-30 flex h-[60vh] flex-col border-t border-border bg-background shadow-2xl lg:hidden">
                <ChatPanel streamId={streamId} isStreamer={isStreamer} />
              </div>
            )}
          </LiveKitRoom>
        ) : (
          mainContent
        )}
      </div>
    </div>
  );
}