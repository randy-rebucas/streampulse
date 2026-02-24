"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Radio,
  Loader2,
  Video,
  Tag,
  FileText,
  Copy,
  Check,
  ExternalLink,
  PhoneOff,
  Youtube,
  Plus,
  Trash2,
  ListVideo,
} from "lucide-react";
import { StreamControls } from "@/components/stream/stream-controls";
import { STREAM_TAGS } from "@/lib/constants";
import { useChatStore } from "@/stores/chat-store";
import { YouTubeQueuePlayer } from "@/components/stream/youtube-queue-player";

interface ActiveStream {
  id: string;
  title: string;
  viewerCount: number;
  startedAt?: string;
}

function extractYouTubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function YouTubePartyControls({ streamId }: { streamId: string }) {
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const room = useRoomContext();
  const youtubeQueue = useChatStore((s) => s.youtubeQueue);
  const youtubeQueueIndex = useChatStore((s) => s.youtubeQueueIndex);
  const setYoutubeQueue = useChatStore((s) => s.setYoutubeQueue);

  const isPlaying = youtubeQueue.length > 0;

  const partyPageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/watch-party/${streamId}`
      : "";

  const broadcast = useCallback(
    (queue: string[], index: number) => {
      if (!room) return;
      const encoder = new TextEncoder();
      room.localParticipant.publishData(
        encoder.encode(JSON.stringify({ type: "youtube", queue, index })),
        { reliable: true }
      );
    },
    [room]
  );

  const persist = useCallback(
    (queue: string[], index: number) => {
      fetch(`/api/streams/${streamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchPartyQueue: queue, watchPartyQueueIndex: index }),
      }).catch(() => {});
    },
    [streamId]
  );

  const handleAddToQueue = () => {
    const id = extractYouTubeId(inputUrl.trim());
    if (!id) return;
    setPendingQueue((prev) => [...prev, id]);
    setInputUrl("");
  };

  const handleRemoveFromQueue = (index: number) => {
    setPendingQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStart = () => {
    if (!pendingQueue.length || !room) return;
    setYoutubeQueue(pendingQueue, 0);
    broadcast(pendingQueue, 0);
    persist(pendingQueue, 0);
    setPendingQueue([]);
  };

  const handleStop = useCallback(() => {
    setYoutubeQueue([], 0);
    broadcast([], 0);
    persist([], 0);
  }, [setYoutubeQueue, broadcast, persist]);

  const handleVideoEnd = useCallback(
    (newIndex: number, queue: string[]) => {
      if (newIndex < queue.length) {
        broadcast(queue, newIndex);
        persist(queue, newIndex);
      } else {
        // Queue exhausted — stop the party
        handleStop();
      }
    },
    [broadcast, persist, handleStop]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Youtube className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium">Watch Party</span>
        {isPlaying && (
          <span className="ml-auto rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
            &#9679; {youtubeQueueIndex + 1}/{youtubeQueue.length}
          </span>
        )}
      </div>

      {isPlaying ? (
        <>
          <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-black">
            <YouTubeQueuePlayer onVideoEnd={handleVideoEnd} emptyLabel="Queue ended." />
          </div>

          {/* Share link */}
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
            <code className="flex-1 truncate text-xs text-primary">{partyPageUrl}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(partyPageUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy watch party link"
            >
              {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={partyPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Open watch party page"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Upcoming queue */}
          {youtubeQueue.length > 1 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Up next</p>
              {youtubeQueue
                .slice(youtubeQueueIndex + 1, youtubeQueueIndex + 4)
                .map((id, i) => (
                  <div
                    key={`${id}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${id}/default.jpg`}
                      alt=""
                      className="h-8 w-14 shrink-0 rounded object-cover"
                    />
                    <code className="flex-1 truncate text-xs text-muted-foreground">{id}</code>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      #{youtubeQueueIndex + 2 + i}
                    </span>
                  </div>
                ))}
            </div>
          )}

          <button
            onClick={handleStop}
            className="w-full rounded-lg bg-destructive/10 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
          >
            Stop Watch Party
          </button>
        </>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Add YouTube videos to the queue — they&apos;ll play in order for all viewers automatically.
          </p>

          {/* URL input */}
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddToQueue()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleAddToQueue}
              disabled={!inputUrl.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {/* Queue list */}
          {pendingQueue.length > 0 ? (
            <div className="mb-3 space-y-1.5">
              {pendingQueue.map((id, i) => (
                <div
                  key={`${id}-${i}`}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2"
                >
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <img
                    src={`https://img.youtube.com/vi/${id}/default.jpg`}
                    alt=""
                    className="h-8 w-14 shrink-0 rounded object-cover"
                  />
                  <code className="flex-1 truncate text-xs text-muted-foreground">{id}</code>
                  <button
                    onClick={() => handleRemoveFromQueue(i)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-3 rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-5 text-center">
              <ListVideo className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No videos queued yet</p>
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={!pendingQueue.length || !room}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Watch Party ({pendingQueue.length} video{pendingQueue.length !== 1 ? "s" : ""})
          </button>
        </>
      )}
    </div>
  );
}

function LocalVideoPreview() {
  const tracks = useTracks([Track.Source.Camera], {
    onlySubscribed: false,
  });

  const localTrack = tracks.find(
    (t) => t.participant.isLocal
  );

  if (!localTrack) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary rounded-xl">
        <div className="text-center">
          <Video className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">
            Camera will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={localTrack}
      className="h-full w-full rounded-xl object-cover"
    />
  );
}

export default function StreamPage() {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const [streamId, setStreamId] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveStream[]>([]);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [youtubeStreamKey, setYoutubeStreamKey] = useState("");
  const [egressId, setEgressId] = useState<string | null>(null);
  const [youtubeStatus, setYoutubeStatus] = useState<"idle" | "starting" | "live" | "error">("idle");

  const watchUrl = typeof window !== "undefined" ? `${window.location.origin}/watch/${streamId}` : ``;

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/streams?userId=${session.user.id}&live=true`)
      .then((r) => r.json())
      .then((data) => setActiveSessions(data.streams ?? []))
      .catch(() => {});
  }, [session?.user?.id]);

  const handleEndSession = async (id: string) => {
    setEndingId(id);
    try {
      await fetch(`/api/streams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: false }),
      });
      setActiveSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to end session:", e);
    } finally {
      setEndingId(null);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
        ? [...prev, tag]
        : prev
    );
  };

  const handleGoLive = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      // Create stream in DB
      const streamRes = await fetch("/api/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, tags: selectedTags }),
      });

      if (!streamRes.ok) throw new Error("Failed to create stream");
      const { stream } = await streamRes.json();
      setStreamId(stream.id);

      // Get LiveKit token
      const tokenRes = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName: stream.id,
          isStreamer: true,
        }),
      });

      if (!tokenRes.ok) throw new Error("Failed to get token");
      const { token: lkToken } = await tokenRes.json();
      setToken(lkToken);
      setIsLive(true);

      // Start YouTube egress if a stream key was provided
      if (youtubeStreamKey.trim()) {
        setYoutubeStatus("starting");
        try {
          const egressRes = await fetch("/api/livekit/egress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName: stream.id, youtubeStreamKey: youtubeStreamKey.trim() }),
          });
          if (egressRes.ok) {
            const { egressId: eid } = await egressRes.json();
            setEgressId(eid);
            setYoutubeStatus("live");
          } else {
            setYoutubeStatus("error");
          }
        } catch {
          setYoutubeStatus("error");
        }
      }
    } catch (error) {
      console.error("Failed to go live:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndStream = useCallback(async () => {
    if (egressId) {
      await fetch("/api/livekit/egress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ egressId }),
      }).catch(() => {});
      setEgressId(null);
      setYoutubeStatus("idle");
    }
    if (streamId) {
      await fetch(`/api/streams/${streamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isLive: false, watchPartyVideoId: null }),
      }).catch(() => {});
    }
    setIsLive(false);
    setToken("");
    setStreamId("");
    setTitle("");
    setDescription("");
    setSelectedTags([]);
    setYoutubeStreamKey("");
  }, [streamId, egressId]);

  if (isLive && token) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-live/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
            <span className="text-sm font-bold text-live">LIVE</span>
          </div>
          {youtubeStatus === "live" && (
            <div className="flex items-center gap-2 rounded-lg bg-red-600/10 px-3 py-1.5">
              <Youtube className="h-3.5 w-3.5 text-red-600" />
              <span className="text-sm font-bold text-red-600">YouTube</span>
            </div>
          )}
          {youtubeStatus === "starting" && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Starting YouTube...</span>
            </div>
          )}
          {youtubeStatus === "error" && (
            <div className="rounded-lg bg-destructive/10 px-3 py-1.5">
              <span className="text-sm text-destructive">YouTube failed</span>
            </div>
          )}
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>

        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
          connect={true}
          className="flex flex-col gap-4"
        >
          {/* Video preview */}
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <LocalVideoPreview />
          </div>

          {/* Controls */}
          <StreamControls onEndStream={handleEndStream} />

          {/* Watch Party */}
          <YouTubePartyControls streamId={streamId} />
        </LiveKitRoom>

        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Share with your viewers</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-secondary px-3 py-2 text-xs text-primary">
              {watchUrl}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(watchUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Go Live</h1>
        <p className="text-muted-foreground">
          Set up your stream and start broadcasting
        </p>
      </div>

      {/* Active sessions */}
      {activeSessions.length > 0 && (
        <div className="mb-6 rounded-xl border border-live/30 bg-live/5 p-4">
          <p className="mb-3 text-sm font-semibold text-live">Active live sessions</p>
          <div className="space-y-2">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-card border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.viewerCount} viewer{s.viewerCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleEndSession(s.id)}
                  disabled={endingId === s.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  {endingId === s.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <PhoneOff className="h-3 w-3" />
                  )}
                  End session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Title */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            <FileText className="mr-1.5 inline h-4 w-4" />
            Stream Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your stream title..."
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            <FileText className="mr-1.5 inline h-4 w-4" />
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's your stream about?"
            rows={3}
            className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            maxLength={500}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            <Tag className="mr-1.5 inline h-4 w-4" />
            Tags (up to 3)
          </label>
          <div className="flex flex-wrap gap-2">
            {STREAM_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* YouTube Streaming */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Youtube className="h-4 w-4 text-red-600" />
            Stream to YouTube <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Enter your YouTube stream key to simultaneously broadcast to YouTube Live.
            Get it from{" "}
            <a
              href="https://studio.youtube.com/channel/live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              YouTube Studio
            </a>
            .
          </p>
          <input
            type="password"
            value={youtubeStreamKey}
            onChange={(e) => setYoutubeStreamKey(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx-xxxx"
            className="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Go Live Button */}
        <button
          onClick={handleGoLive}
          disabled={!title.trim() || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-live py-4 text-base font-bold text-white hover:bg-live/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Radio className="h-5 w-5" />
          )}
          {isLoading ? "Starting stream..." : "Go Live"}
        </button>
      </div>
    </div>
  );
}
