"use client";

import { useEffect, useState, use } from "react";
import { useUser } from "@clerk/nextjs";
import {
  LiveKitRoom,
} from "@livekit/components-react";
import { Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { StreamPlayer } from "@/components/stream/stream-player";
import { StreamInfo } from "@/components/stream/stream-info";
import { ChatPanel } from "@/components/chat/chat-panel";

interface StreamData {
  id: string;
  title: string;
  description: string | null;
  isLive: boolean;
  viewerCount: number;
  tags: string[];
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    clerkId: string;
  };
}

export default function WatchPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const { user, isSignedIn } = useUser();
  const [stream, setStream] = useState<StreamData | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStream() {
      try {
        // Fetch stream data
        const res = await fetch(`/api/streams/${streamId}`);
        if (!res.ok) {
          setError("Stream not found");
          return;
        }

        const data = await res.json();
        setStream(data.stream);

        // Get viewer token if signed in
        if (isSignedIn) {
          const tokenRes = await fetch("/api/livekit/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomName: streamId,
              isStreamer: false,
            }),
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
  }, [streamId, isSignedIn]);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Main content - Video + Info */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl p-4">
            {/* Video Player */}
            {token && stream.isLive ? (
              <LiveKitRoom
                token={token}
                serverUrl={serverUrl}
                connect={true}
                className="aspect-video overflow-hidden rounded-xl bg-black"
              >
                <StreamPlayer
                  token={token}
                  serverUrl={serverUrl}
                  streamerIdentity={stream.user.clerkId}
                />
                {/* Chat panel with LiveKit room context */}
                <div className="hidden">
                  {/* Hidden: chat panel uses room context separately */}
                </div>
              </LiveKitRoom>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary">
                <div className="text-center">
                  <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    {stream.isLive
                      ? "Sign in to watch this stream"
                      : "This stream has ended"}
                  </p>
                </div>
              </div>
            )}

            {/* Stream Info */}
            <StreamInfo
              title={stream.title}
              streamerName={stream.user.displayName || stream.user.username}
              streamerAvatar={stream.user.avatarUrl || undefined}
              viewerCount={stream.viewerCount}
              tags={stream.tags}
              isLive={stream.isLive}
            />
          </div>
        </div>

        {/* Chat Sidebar */}
        {token && stream.isLive && (
          <div className="hidden w-80 shrink-0 border-l border-border lg:block">
            <LiveKitRoom
              token={token}
              serverUrl={serverUrl}
              connect={true}
              className="h-full"
            >
              <ChatPanel streamId={streamId} />
            </LiveKitRoom>
          </div>
        )}
      </div>
    </div>
  );
}
