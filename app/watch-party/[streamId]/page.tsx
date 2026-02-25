"use client";

import { useEffect, useRef, useCallback, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Youtube,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  UserCheck,
  Users,
  Play,
  ListVideo,
  SmilePlus,
  Pin,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { PollWidget } from "@/components/stream/poll-widget";
import { useChatStore } from "@/stores/chat-store";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
    _ytReadyCallbacks: Array<() => void>;
  }
}

function ensureYTApiLoaded(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (!window._ytReadyCallbacks) window._ytReadyCallbacks = [];
  if (window.YT?.Player) { onReady(); return; }
  window._ytReadyCallbacks.push(onReady);
  if (!document.getElementById("yt-iframe-api")) {
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      (window._ytReadyCallbacks ?? []).forEach((cb) => cb());
      window._ytReadyCallbacks = [];
    };
  }
}

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
interface HostInfo {
  username: string;
  name: string | null;
  image: string | null;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👏", "😮", "🎉"];

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */
export default function WatchPartyPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId: username } = use(params);
  const chatStreamId = `watchparty-${username}`;

  // ── Video state
  const [queue, setQueue] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [host, setHost] = useState<HostInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isLiveRef = useRef(false);

  // ── Chat state
  const { data: session } = useSession();
  const {
    messages,
    setMessages: setStoreMessages,
    addReaction,
    reactions,
    removeReaction,
    activePoll,
    setActivePoll,
    pinnedMessage,
    setPinnedMessage,
  } = useChatStore();
  const [chatOpen, setChatOpen] = useState(true);
  const [showReactions, setShowReactions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMsgIdRef = useRef<string | null>(null);

  // ── Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  /* ── Load queue + host (also polls every 10s when live to sync host's position) */
  const loadParty = useCallback(async (initial = false) => {
    try {
      const res = await fetch(`/api/watch-party/${username}`);
      const data = await res.json();
      if (data.error) {
        if (initial) setError(data.error);
        return;
      }
      const newQueue: string[] = data.queue ?? [];
      const newIndex: number = data.queueIndex ?? 0;
      const live: boolean = data.isLive ?? false;

      if (initial) {
        setQueue(newQueue);
        setIndex(newIndex);
        setIsLive(live);
        isLiveRef.current = live;
        setHost(data.user);
        // Load follow status for the host
        if (data.user?.username) {
          fetch(`/api/follow/${data.user.username}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d) { setIsFollowing(d.isFollowing); setFollowerCount(d.followerCount); } })
            .catch(() => {});
        }
      } else if (live && isLiveRef.current) {
        // Sync live host's queue index without resetting playing video
        setQueue(newQueue);
        setIndex(newIndex);
      } else if (!live && isLiveRef.current) {
        // Host went offline — switch to static queue from the top
        setIsLive(false);
        isLiveRef.current = false;
        setQueue(newQueue);
        setIndex(0);
      }
    } catch {
      // ignore poll errors
    }
  }, [username]);

  useEffect(() => {
    loadParty(true).finally(() => setLoading(false));
  }, [loadParty]);

  // Poll every 10s to sync live host's position
  useEffect(() => {
    const id = setInterval(() => loadParty(false), 10_000);
    return () => clearInterval(id);
  }, [loadParty]);

  /* ── YouTube player */
  const loadVideo = useCallback((videoId: string) => {
    if (!containerRef.current) return;
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    const div = document.createElement("div");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(div);
    playerRef.current = new window.YT.Player(div, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
      events: {
        onStateChange: (event: { data: number }) => {
          if (event.data === 0) setIndex((prev) => prev + 1);
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!queue.length) return;
    const wrapped = index % queue.length;
    if (index !== wrapped) setIndex(wrapped);
  }, [index, queue.length]);

  useEffect(() => {
    if (!queue.length) return;
    const videoId = queue[index % queue.length];
    ensureYTApiLoaded(() => loadVideo(videoId));
  }, [queue, index, loadVideo]);

  useEffect(() => () => { playerRef.current?.destroy(); }, []);

  /* ── Chat: initial load + 3-second polling */
  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res = await fetch(`/api/chat/history?streamId=${chatStreamId}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = (data.messages ?? []).map((m: any) => ({
        id: m.id,
        content: m.content,
        username: m.username,
        userSlug: m.userSlug ?? undefined,
        avatarUrl: m.avatarUrl ?? undefined,
        isBot: !!m.isBot,
        isFlagged: !!m.isFlagged,
        createdAt: new Date(m.createdAt),
      }));
      if (initial) {
        setStoreMessages(msgs);
        if (data.pinnedMessage) setPinnedMessage(data.pinnedMessage);
        if (msgs.length) latestMsgIdRef.current = msgs[msgs.length - 1].id;
        return;
      }
      if (!msgs.length) return;
      const newest = msgs[msgs.length - 1].id;
      if (newest === latestMsgIdRef.current) return;
      latestMsgIdRef.current = newest;
      setStoreMessages(msgs);
    } catch {/* ignore */}
  }, [chatStreamId, setStoreMessages, setPinnedMessage]);

  useEffect(() => { fetchMessages(true); }, [fetchMessages]);

  useEffect(() => {
    const id = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  /* ── Poll: load once + poll every 30s */
  useEffect(() => {
    async function loadPoll() {
      try {
        const res = await fetch(`/api/polls?streamId=${chatStreamId}`);
        if (res.ok) { const { poll } = await res.json(); setActivePoll(poll); }
      } catch {}
    }
    loadPoll();
    const id = setInterval(loadPoll, 30_000);
    return () => clearInterval(id);
  }, [chatStreamId, setActivePoll]);

  /* ── Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Follow / unfollow host */
  const handleFollow = async () => {
    if (!host?.username || !session) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/follow/${host.username}`, { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setIsFollowing(d.following);
        setFollowerCount(d.followerCount);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  /* ── Send a message */
  const handleSend = useCallback(async (content: string): Promise<{ error?: string }> => {
    if (!session?.user) return { error: "Sign in to chat" };
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, streamId: chatStreamId }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error ?? "Message not sent" };
      fetchMessages(true);
      return {};
    } catch {
      return { error: "Failed to send message" };
    }
  }, [session, chatStreamId, fetchMessages]);

  /* ─────────────────────────────────────────────────────────
     Loading / error / empty states
  ───────────────────────────────────────────────────────── */
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

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold">Watch Party Not Found</h1>
          <p className="text-muted-foreground">{error}</p>
          <Link href="/" className="mt-2 text-sm text-primary hover:underline underline-offset-4">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!queue.length) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-3">
          <Youtube className="h-12 w-12 text-muted-foreground/30" />
          <h1 className="text-xl font-bold">No videos queued</h1>
          <p className="text-muted-foreground">
            {host?.name ?? host?.username ?? username} hasn&apos;t added any videos yet.
          </p>
          {host?.username && (
            <Link
              href={`/u/${host.username}`}
              className="mt-2 flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:bg-secondary transition-colors"
            >
              View {host.name ?? host.username}&apos;s profile
            </Link>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = index % queue.length;

  /* ─────────────────────────────────────────────────────────
     Main layout: video + chat
  ───────────────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
        {/* ── Video panel */}
        <div className="relative flex flex-col flex-1 bg-black overflow-hidden">
          {/* Player — fills remaining height above the queue strip */}
          <div ref={containerRef} className="flex-1 w-full min-h-0" />

          {/* Floating reaction particles */}
          {reactions.map((r) => (
            <span
              key={r.id}
              className="pointer-events-none absolute bottom-14 text-3xl animate-reaction-float"
              style={{ left: `${r.x}%` }}
              onAnimationEnd={() => removeReaction(r.id)}
            >
              {r.emoji}
            </span>
          ))}

          {/* Queue strip */}
          <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 overflow-x-auto shrink-0">
            <ListVideo className="h-3.5 w-3.5 shrink-0 text-white/40" />
            {queue.map((id, i) => (
              <button
                key={`${id}-${i}`}
                onClick={() => setIndex(i)}
                title={`Video ${i + 1}`}
                className={`relative shrink-0 rounded overflow-hidden transition-all ${
                  i === currentIndex
                    ? "ring-2 ring-primary scale-110"
                    : "opacity-50 hover:opacity-80"
                }`}
              >
                <img
                  src={`https://img.youtube.com/vi/${id}/default.jpg`}
                  alt={`Video ${i + 1}`}
                  className="h-8 w-14 object-cover"
                />
                {i === currentIndex && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-3 w-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Host info overlay */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {host?.username ? (
              <Link href={`/u/${host.username}`} className="shrink-0">
                {host.image ? (
                  <img
                    src={host.image}
                    alt={host.name ?? host.username}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20 hover:ring-primary/60 transition-all"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-white/20">
                    {(host.name ?? host.username)[0]?.toUpperCase()}
                  </div>
                )}
              </Link>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-white/20">
                {(host?.name ?? host?.username ?? username)[0]?.toUpperCase()}
              </div>
            )}
            <div className="rounded-lg bg-black/60 px-2.5 py-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">
                  {host?.name ?? host?.username ?? username}&apos;s Watch Party
                </span>
                {isLive ? (
                  <span className="rounded-full bg-live px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    ● Live
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50">
                    Saved
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/50">
                  {currentIndex + 1} / {queue.length}
                </span>
                <span className="flex items-center gap-0.5 text-[10px] text-white/40">
                  <Users className="h-2.5 w-2.5" />
                  {followerCount.toLocaleString()}
                </span>
              </div>
            </div>
            {session && (session?.user as any)?.username !== host?.username && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors disabled:opacity-60 ${
                  isFollowing
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {followLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="h-3 w-3" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Chat toggle button */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white transition-colors backdrop-blur-sm"
            title={chatOpen ? "Hide chat" : "Show chat"}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {chatOpen ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </>
            )}
          </button>
        </div>

        {/* ── Chat panel */}
        {chatOpen && (
          <div className="flex w-72 shrink-0 flex-col border-l border-border bg-card sm:w-80 lg:w-96">
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Watch Party Chat</h2>
              {isLive && (
                <span className="rounded-full bg-live px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  ● Live
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{messages.length}</span>
            </div>

            {/* Pinned message */}
            {pinnedMessage && (
              <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-4 py-2">
                <Pin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <p className="text-xs text-foreground/80 break-words">{pinnedMessage}</p>
              </div>
            )}

            {/* Poll widget — only renders when a poll is active */}
            {activePoll && (
              <div className="border-b border-border px-3 py-2">
                <PollWidget streamId={chatStreamId} isStreamer={false} />
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
              )}
            </div>

            {/* Reactions bar */}
            {session && (
              <div className="border-t border-border px-3 pt-2">
                <div className="flex flex-wrap items-center gap-1 mb-1">
                  <button
                    onClick={() => setShowReactions((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <SmilePlus className="h-3.5 w-3.5" />
                    React
                  </button>
                  {showReactions &&
                    REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addReaction(emoji)}
                        className="rounded px-1.5 py-0.5 text-base hover:bg-secondary transition-colors active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Input */}
            <ChatInput onSend={handleSend} disabled={!session?.user} />
          </div>
        )}
      </div>
    </div>
  );
}
