"use client";

import { useEffect, useRef, useState, use } from "react";

interface ChatMsg {
  id: string;
  username: string;
  content: string;
  avatarUrl?: string;
  isBot: boolean;
}

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
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/chat/history?streamId=${streamId}`);
        if (res.ok) {
          const data = await res.json();
          const incoming: ChatMsg[] = data.messages
            .filter((m: any) => !seenIds.current.has(m.id))
            .map((m: any) => {
              seenIds.current.add(m.id);
              return {
                id: m.id,
                username: m.username,
                content: m.content,
                avatarUrl: m.avatarUrl,
                isBot: m.isBot,
              };
            });
          if (incoming.length > 0) {
            setMessages((prev) => [...prev, ...incoming].slice(-40));
          }
        }
      } catch { /* silent */ }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [streamId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="flex h-screen flex-col justify-end overflow-hidden"
      style={{ background: "transparent" }}
    >
      <div ref={scrollRef} className="flex flex-col gap-1.5 overflow-hidden px-3 pb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex items-start gap-2 rounded-lg bg-black/70 px-3 py-2 backdrop-blur-sm"
            style={{ maxWidth: "90%" }}
          >
            {msg.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.avatarUrl}
                alt=""
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
              />
            ) : (
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                style={{ background: stringToColor(msg.username), color: "#fff" }}
              >
                {msg.username[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span
                className="mr-1.5 text-xs font-bold"
                style={{ color: stringToColor(msg.username) }}
              >
                {msg.isBot ? "🤖 " : ""}{msg.username}
              </span>
              <span className="text-xs text-white">{msg.content}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
