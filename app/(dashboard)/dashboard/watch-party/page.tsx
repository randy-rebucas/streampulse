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
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
  Link2,
  Trash,
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

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [quickPlayInput, setQuickPlayInput] = useState("");
  const [quickPlayError, setQuickPlayError] = useState(false);

  const username = (session?.user as any)?.username;
  const partyUrl = username ? `/watch-party/${username}` : null;
  const fullPartyUrl =
    partyUrl && typeof window !== "undefined"
      ? `${window.location.origin}${partyUrl}`
      : partyUrl ?? "";

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) { setLoadingQueue(false); return; }
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
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // keep preview index in sync
      if (previewIndex === index) { setPreviewId(null); setPreviewIndex(null); }
      else if (previewIndex !== null && index < previewIndex) setPreviewIndex(previewIndex - 1);
      return next;
    });
    setSaved(false);
  };

  const handleClearAll = () => {
    setQueue([]);
    setPreviewId(null);
    setPreviewIndex(null);
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
    } catch { /* no-op */ }
    finally { setSaving(false); }
  }, [queue]);

  const handleCopy = () => {
    if (!fullPartyUrl) return;
    navigator.clipboard.writeText(fullPartyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreviewVideo = (id: string, index: number) => {
    setPreviewId(id);
    setPreviewIndex(index);
  };

  const handlePreviewClose = () => { setPreviewId(null); setPreviewIndex(null); };

  const handlePreviewPrev = () => {
    if (previewIndex === null || queue.length === 0) return;
    const next = (previewIndex - 1 + queue.length) % queue.length;
    setPreviewIndex(next);
    setPreviewId(queue[next]);
  };

  const handlePreviewNext = () => {
    if (previewIndex === null || queue.length === 0) return;
    const next = (previewIndex + 1) % queue.length;
    setPreviewIndex(next);
    setPreviewId(queue[next]);
  };

  const handleQuickPlay = () => {
    const id = extractYouTubeId(quickPlayInput.trim());
    if (!id) { setQuickPlayError(true); return; }
    setQuickPlayError(false);
    setPreviewId(id);
    setPreviewIndex(null);
    setQuickPlayInput("");
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Watch Party</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Build a YouTube playlist that loops automatically for anyone with your link.
        </p>
      </div>

      {/* Share link bar — always at top */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        {partyUrl ? (
          <>
            <code className="flex-1 truncate text-xs text-primary">{fullPartyUrl}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copied ? (
                <span className="flex items-center gap-1 text-green-500"><Check className="h-3.5 w-3.5" />Copied</span>
              ) : (
                <span className="flex items-center gap-1"><Copy className="h-3.5 w-3.5" />Copy link</span>
              )}
            </button>
            <a
              href={partyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Open watch party"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your watch party URL will appear here once your profile has a username.
          </p>
        )}
      </div>

      {/* 2-col main layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Left: Queue builder ─────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ListVideo className="h-4 w-4 text-primary" />
                Video Queue
                {queue.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {queue.length}
                  </span>
                )}
              </h2>
              {queue.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>

            {/* URL input */}
            <div className="mb-1 flex gap-2">
              <input
                type="text"
                value={videoInput}
                onChange={(e) => { setVideoInput(e.target.value); setInputError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="YouTube URL or video ID"
                className={`flex-1 rounded-lg border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                  inputError ? "border-destructive" : "border-border"
                }`}
              />
              <button
                onClick={handleAdd}
                disabled={!videoInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {inputError && (
              <p className="mb-2 text-xs text-destructive">
                Couldn&apos;t find a video ID. Try a URL like{" "}
                <code className="text-[11px]">youtube.com/watch?v=…</code>
              </p>
            )}

            {/* Queue list */}
            <div className="mt-3">
              {loadingQueue ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2">
                      <div className="h-12 w-20 rounded bg-muted" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-3/4 rounded bg-muted" />
                        <div className="h-2.5 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : queue.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-10 text-center">
                  <Youtube className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Queue is empty</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Paste YouTube URLs above to build your playlist.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {queue.map((id, i) => (
                    <div
                      key={`${id}-${i}`}
                      className={`group flex items-center gap-2.5 rounded-lg border bg-secondary px-2.5 py-2 transition-colors hover:bg-secondary/70 ${
                        previewIndex === i ? "border-primary/40 bg-primary/5" : "border-border"
                      }`}
                    >
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                      {/* Thumbnail with index badge */}
                      <div className="relative shrink-0">
                        <img
                          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                          alt=""
                          className="h-11 w-[78px] rounded object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-px text-[9px] font-bold text-white leading-none">
                          {i + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <a
                          href={`https://youtube.com/watch?v=${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs font-medium text-foreground hover:text-primary transition-colors"
                        >
                          youtu.be/{id}
                        </a>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">YouTube video</p>
                      </div>
                      <button
                        onClick={() => handlePreviewVideo(id, i)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(i)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                {queue.length} video{queue.length !== 1 ? "s" : ""}
                {!saved && queue.length > 0 && (
                  <span className="ml-1.5 text-amber-500">· unsaved changes</span>
                )}
              </p>
              <button
                onClick={handleSave}
                disabled={saving || queue.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving…" : saved ? "Saved" : "Save Queue"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Player (sticky) ───────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Play className="h-4 w-4 text-primary" />
              Preview Player
            </h2>

            {/* Quick-play input */}
            <div className="mb-1 flex gap-2">
              <input
                type="text"
                value={quickPlayInput}
                onChange={(e) => { setQuickPlayInput(e.target.value); setQuickPlayError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleQuickPlay()}
                placeholder="Paste a URL to play instantly…"
                className={`flex-1 rounded-lg border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors ${
                  quickPlayError ? "border-destructive" : "border-border"
                }`}
              />
              <button
                onClick={handleQuickPlay}
                disabled={!quickPlayInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="h-3.5 w-3.5" />
                Play
              </button>
            </div>
            {quickPlayError && (
              <p className="mb-2 text-xs text-destructive">
                Couldn&apos;t find a video ID.
              </p>
            )}

            <div className="mt-3">
              {previewId ? (
                <>
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
                    <iframe
                      key={previewId}
                      src={`https://www.youtube.com/embed/${previewId}?autoplay=1&rel=0&modestbranding=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                      title="YouTube Preview"
                    />
                    <button
                      onClick={handlePreviewClose}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white/70 hover:text-white transition-colors"
                      title="Close"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {previewIndex !== null && queue.length > 1 && (
                        <>
                          <button
                            onClick={handlePreviewPrev}
                            className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Prev
                          </button>
                          <button
                            onClick={handlePreviewNext}
                            className="flex items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs font-medium hover:bg-secondary/80 transition-colors"
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {previewIndex !== null && (
                        <span>{previewIndex + 1} / {queue.length}</span>
                      )}
                      <a
                        href={`https://youtube.com/watch?v=${previewId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 hover:text-foreground transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        YouTube
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 py-14">
                  <Youtube className="h-9 w-9 text-muted-foreground/25" />
                  <p className="text-sm font-medium text-muted-foreground">No video playing</p>
                  <p className="text-center text-xs text-muted-foreground">
                    Paste a URL above, or click{" "}
                    <Eye className="inline h-3.5 w-3.5 align-text-bottom" />{" "}
                    on a queued video
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
