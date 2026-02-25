"use client";

import { useEffect, useRef, useState, use } from "react";

interface ChatMsg {
  id: string;
  username: string;
  content: string;
  avatarUrl?: string;
  isBot: boolean;
}

const MAX_MESSAGES = 40;

export default function StreamOverlayPage({
  params,
}: {
  params: Promise<{ streamId: string }>;
}) {
  const { streamId } = use(params);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef(new Set<string>());

  // Poll for new chat messages every 3 seconds (no auth, no WebSocket needed)
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/chat/history?streamId=${streamId}`);
        if (res.ok) {
          const data = await res.json();
          const incoming: ChatMsg[] = (data.messages ?? [])
            .filter((m: any) => !seenIds.current.has(m.id))
            .map((m: any) => {
              seenIds.current.add(m.id);
              return {
                id: m.id,
                username: m.username,
                content: m.content,
                avatarUrl: m.avatarUrl,
                isBot: !!m.isBot,
              };
            });
          if (incoming.length > 0) {
            setMessages((prev) => {
              const next = [...prev, ...incoming].slice(-MAX_MESSAGES);
              // Keep seenIds lean — drop IDs that were pruned
              const kept = new Set(next.map((m) => m.id));
              seenIds.current.forEach((id) => {
                if (!kept.has(id)) seenIds.current.delete(id);
              });
              return next;
            });
          }
        }
      } catch { /* silent — overlay must never crash */ }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [streamId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      {/* Keyframe animation injected once */}
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-in { animation: msgIn 0.22s ease-out both; }
      `}</style>

      <div
        className="relative flex h-screen flex-col justify-end overflow-hidden"
        style={{ background: "transparent" }}
      >
        {/* Top fade — old messages dissolve upward */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)" }}
        />

        <div ref={scrollRef} className="flex flex-col gap-1.5 overflow-hidden px-3 pb-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="msg-in flex items-start gap-2 rounded-lg px-3 py-2 backdrop-blur-sm"
              style={{
                maxWidth: "92%",
                background: msg.isBot ? "rgba(99,102,241,0.75)" : "rgba(0,0,0,0.72)",
              }}
            >
              {/* Avatar */}
              {msg.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.avatarUrl}
                  alt=""
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
                />
              ) : (
                <div
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: stringToColor(msg.username) }}
                >
                  {msg.username[0]?.toUpperCase()}
                </div>
              )}

              {/* Text */}
              <div className="min-w-0 leading-snug">
                <span
                  className="mr-1.5 text-xs font-bold"
                  style={{ color: msg.isBot ? "#c7d2fe" : stringToColor(msg.username) }}
                >
                  {msg.isBot && (
                    <span className="mr-1 rounded-sm bg-white/20 px-1 py-px text-[9px] font-semibold uppercase tracking-wide">
                      AI
                    </span>
                  )}
                  {msg.username}
                </span>
                <span className="text-xs text-white/90">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Deterministic hue from username string */
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 65%)`;
}
