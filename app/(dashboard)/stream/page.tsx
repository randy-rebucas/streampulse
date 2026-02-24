"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
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
} from "lucide-react";
import { StreamControls } from "@/components/stream/stream-controls";
import { STREAM_TAGS } from "@/lib/constants";

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
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const [streamId, setStreamId] = useState("");

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
    } catch (error) {
      console.error("Failed to go live:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndStream = useCallback(async () => {
    setIsLive(false);
    setToken("");
    setStreamId("");
    setTitle("");
    setDescription("");
    setSelectedTags([]);
  }, []);

  if (isLive && token) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-live/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
            <span className="text-sm font-bold text-live">LIVE</span>
          </div>
          <h1 className="text-lg font-bold truncate">{title}</h1>
        </div>

        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_WS_URL}
          connect={true}
          video={true}
          audio={true}
          className="flex flex-col gap-4"
        >
          {/* Video preview */}
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <LocalVideoPreview />
          </div>

          {/* Controls */}
          <StreamControls onEndStream={handleEndStream} />
        </LiveKitRoom>

        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Share this link with your viewers:{" "}
            <code className="rounded bg-secondary px-2 py-1 text-xs text-primary">
              {typeof window !== "undefined" ? window.location.origin : ""}/watch/{streamId}
            </code>
          </p>
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
