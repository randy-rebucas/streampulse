"use client";

import { useEffect, useRef, useCallback, useState, use } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  AlertCircle,
  Youtube,
  MessageSquare,
  Send,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { CHAT_MAX_LENGTH } from "@/lib/constants";

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

interface ChatMsg {
  id: string;
  content: string;
  username: string;
  avatarUrl?: string | null;
  isBot: boolean;
  createdAt: string;
}

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
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestMsgIdRef = useRef<string | null>(null);

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
      const msgs: ChatMsg[] = data.messages ?? [];
      if (initial) {
        setMessages(msgs);
        if (msgs.length) latestMsgIdRef.current = msgs[msgs.length - 1].id;
        return;
      }
      if (!msgs.length) return;
      const newest = msgs[msgs.length - 1].id;
      if (newest === latestMsgIdRef.current) return;
      latestMsgIdRef.current = newest;
      setMessages(msgs);
    } catch {/* ignore */}
  }, [chatStreamId]);

  useEffect(() => { fetchMessages(true); }, [fetchMessages]);

  useEffect(() => {
    const id = setInterval(() => fetchMessages(false), 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  /* ── Auto-scroll to bottom on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  /* ── Send a message */
  const handleSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || sending || !session?.user) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, streamId: chatStreamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error ?? "Message not sent");
        setTimeout(() => setSendError(null), 5000);
      } else {
        setChatInput("");
        fetchMessages(true);
      }
    } catch {
      setSendError("Failed to send message");
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

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
        <div className="relative flex-1 bg-black">
          <div ref={containerRef} className="h-full w-full" />

          {/* Host info + progress overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-3">
            {host?.image ? (
              <img
                src={host.image}
                alt={host.name ?? host.username}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary ring-2 ring-white/20">
                {(host?.name ?? host?.username ?? username)[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-white drop-shadow">
                  {host?.name ?? host?.username ?? username}&apos;s Watch Party
                </p>
                {isLive && (
                  <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    ● Live
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 drop-shadow">
                {currentIndex + 1} / {queue.length}
                {!isLive && (
                  <span className="ml-1 opacity-60">(saved queue)</span>
                )}
              </p>
            </div>
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
              <h2 className="text-sm font-semibold">Live Chat</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {messages.length} messages
              </span>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-center text-sm text-muted-foreground">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 px-4 py-1.5 hover:bg-secondary/50 transition-colors ${
                      msg.isBot ? "bg-primary/5" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        msg.isBot
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {msg.isBot ? (
                        <Bot className="h-3.5 w-3.5" />
                      ) : msg.avatarUrl ? (
                        <img
                          src={msg.avatarUrl}
                          alt={msg.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        msg.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="inline">
                        <span
                          className={`text-sm font-semibold ${
                            msg.isBot ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {msg.isBot ? "StreamPulse AI" : msg.username}
                        </span>
                        {msg.isBot && (
                          <span className="ml-1 inline-flex items-center rounded bg-primary/20 px-1 py-0.5 text-[10px] font-bold text-primary align-middle">
                            BOT
                          </span>
                        )}
                        <span className="ml-2 text-sm text-foreground/80">
                          {msg.content}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              {sendError && (
                <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {sendError}
                </div>
              )}
              {!session?.user ? (
                <p className="text-center text-xs text-muted-foreground py-2">
                  <a
                    href="/sign-in"
                    className="text-primary hover:underline underline-offset-2"
                  >
                    Sign in
                  </a>{" "}
                  to join the chat
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="Send a message..."
                    maxLength={CHAT_MAX_LENGTH}
                    disabled={sending}
                    className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!chatInput.trim() || sending}
                    className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
              {chatInput.length > CHAT_MAX_LENGTH * 0.8 && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground">
                  {chatInput.length}/{CHAT_MAX_LENGTH}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
