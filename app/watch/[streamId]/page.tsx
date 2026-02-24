"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { LiveKitRoom } from "@livekit/components-react";
import { Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { StreamPlayer } from "@/components/stream/stream-player";
import { StreamInfo } from "@/components/stream/stream-info";
import { ChatPanel } from "@/components/chat/chat-panel";
import { YouTubeSync } from "@/components/stream/youtube-sync";
import { YouTubeQueuePlayer } from "@/components/stream/youtube-queue-player";
import { useChatStore } from "@/stores/chat-store";

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
  const isSignedIn = !!session;
  const [stream, setStream] = useState<StreamData | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setYoutubeVideoId = useChatStore((s) => s.setYoutubeVideoId);
  const setYoutubeQueue = useChatStore((s) => s.setYoutubeQueue);
  const youtubeVideoId = useChatStore((s) => s.youtubeVideoId);

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

        // Seed watch party state for late joiners
        if (data.stream.watchPartyQueue?.length) {
          setYoutubeQueue(
            data.stream.watchPartyQueue,
            data.stream.watchPartyQueueIndex ?? 0
          );
        }

        if (isSignedIn) {
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
  }, [streamId, isSignedIn, setYoutubeVideoId]);

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
        </div>
      </div>
    );
  }

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL || "";

  // Main content area — shared between authenticated and unauthenticated views
  const mainContent = (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl p-4">
        {/* Video player — YouTube watch party takes over the player when active */}
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          {youtubeVideoId ? (
            <YouTubeQueuePlayer />
          ) : token && stream.isLive ? (
            <StreamPlayer streamerIdentity={stream.user.id} />
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary">
              <p className="text-sm text-muted-foreground">
                {token ? "Waiting for stream to start..." : "Sign in to watch this stream"}
              </p>
            </div>
          )}
        </div>

        <StreamInfo
          title={stream.title}
          streamerName={stream.user.name || stream.user.username}
          streamerAvatar={stream.user.image || undefined}
          viewerCount={stream.viewerCount}
          tags={stream.tags}
          isLive={stream.isLive}
        />

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

            {/* Chat sidebar — always in DOM for data channel; visually hidden on mobile */}
            <div className="hidden w-80 shrink-0 border-l border-border lg:block">
              <ChatPanel streamId={streamId} />
            </div>
          </LiveKitRoom>
        ) : (
          mainContent
        )}
      </div>
    </div>
  );
}