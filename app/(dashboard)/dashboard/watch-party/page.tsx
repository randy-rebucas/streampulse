"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Youtube,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  ListVideo,
  Save,
  GripVertical,
} from "lucide-react";

function extractYouTubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function WatchPartyDashboardPage() {
  const { data: session, status } = useSession();
  const [queue, setQueue] = useState<string[]>([]);
  const [videoInput, setVideoInput] = useState("");
  const [inputError, setInputError] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const username = (session?.user as any)?.username;
  const partyUrl = username ? `/watch-party/${username}` : null;

  // Load existing queue once the session (and user id) is confirmed
  useEffect(() => {
    if (status === "loading") return;        // session not ready yet
    if (!session?.user?.id) {
      setLoadingQueue(false);               // unauthenticated — nothing to load
      return;
    }
    fetch("/api/user/watch-party")
      .then((r) => r.json())
      .then((data) => setQueue(data.queue ?? []))
      .catch(() => {})
      .finally(() => setLoadingQueue(false));
  }, [session?.user?.id, status]);

  const handleAdd = () => {
    const id = extractYouTubeId(videoInput.trim());
    if (!id) { setInputError(true); return; }
    setQueue((prev) => [...prev, id]);
    setVideoInput("");
    setInputError(false);
    setSaved(false);
  };

  const handleRemove = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await fetch("/api/user/watch-party", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // no-op
    } finally {
      setSaving(false);
    }
  }, [queue]);

  const handleCopy = () => {
    if (!partyUrl) return;
    navigator.clipboard.writeText(`${window.location.origin}${partyUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Watch Party</h1>
        <p className="text-muted-foreground">
          Build a YouTube playlist that loops automatically for anyone with your link.
        </p>
      </div>

      <div className="space-y-6">
        {/* Queue builder */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <ListVideo className="h-4 w-4 text-primary" />
            Video Queue
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Videos play one after another and loop back to the start automatically.
          </p>

          {/* URL input */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={videoInput}
              onChange={(e) => { setVideoInput(e.target.value); setInputError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="https://youtube.com/watch?v=... or video ID"
              className="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleAdd}
              disabled={!videoInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>

          {inputError && (
            <p className="-mt-2 mb-3 text-xs text-destructive">
              Couldn&apos;t extract a video ID. Try a full URL like{" "}
              <code>youtube.com/watch?v=dQw4w9WgXcQ</code>.
            </p>
          )}

          {/* Queue list */}
          {loadingQueue ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your queue...
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/40 px-4 py-10 text-center">
              <Youtube className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">Queue is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Paste YouTube URLs above to build your playlist.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((id, i) => (
                <div
                  key={`${id}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <span className="w-4 shrink-0 text-center text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <img
                    src={`https://img.youtube.com/vi/${id}/default.jpg`}
                    alt=""
                    className="h-10 w-16 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <code className="block truncate text-xs text-muted-foreground">{id}</code>
                    <a
                      href={`https://youtube.com/watch?v=${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline underline-offset-2"
                    >
                      Open on YouTube
                    </a>
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {queue.length} video{queue.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={handleSave}
              disabled={saving || queue.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : saved ? "Saved!" : "Save Queue"}
            </button>
          </div>
        </div>

        {/* Share link */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
            <Youtube className="h-4 w-4 text-red-600" />
            Your Watch Party Link
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Share this link. Anyone who opens it will see your videos playing in fullscreen, looping
            automatically — no sign-in needed.
          </p>

          {partyUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5">
              <code className="flex-1 truncate text-xs text-primary">
                {typeof window !== "undefined"
                  ? `${window.location.origin}${partyUrl}`
                  : partyUrl}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <a
                href={partyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Open watch party"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your watch party URL will appear here once your profile has a username.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


