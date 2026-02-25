"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind, RoomEvent } from "livekit-client";
import { MessageSquare, SmilePlus, Shield } from "lucide-react";
import { useChatStore, type ChatMessage as ChatMessageType } from "@/stores/chat-store";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { PinnedMessage } from "./pinned-message";
import { PollWidget } from "@/components/stream/poll-widget";

interface ChatPanelProps {
  streamId: string;
  isStreamer?: boolean;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👏", "😮", "🎉"];

export function ChatPanel({ streamId, isStreamer = false }: ChatPanelProps) {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const {
    messages, addMessage, setConnected,
    pinnedMessage, setPinnedMessage,
    addReaction,
    setActivePoll, updatePollVotes,
  } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();
  const [showReactions, setShowReactions] = useState(false);
  const [banning, setBanning] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Broadcast helper
  const broadcast = useCallback(
    (data: object) => {
      if (!room) return;
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(data)), { reliable: true });
    },
    [room]
  );

  // Listen for all LiveKit data events
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      _participant?: any,
      _kind?: DataPacket_Kind,
      _topic?: string
    ) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        switch (data.type) {
          case "chat":
            addMessage({
              id: data.id || crypto.randomUUID(),
              content: data.content,
              username: data.username,
              avatarUrl: data.avatarUrl,
              isBot: data.isBot || false,
              isFlagged: false,
              createdAt: new Date(data.createdAt || Date.now()),
            });
            break;
          case "reaction":
            addReaction(data.emoji);
            break;
          case "pinned":
            setPinnedMessage(data.message ?? "");
            break;
          case "poll_create":
            setActivePoll(data.poll);
            break;
          case "poll_update":
            if (data.poll) updatePollVotes(data.poll.options, data.poll.totalVotes);
            break;
          case "poll_end":
            setActivePoll(null);
            break;
        }
      } catch (e) {
        console.error("Failed to parse data message:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    setConnected(true);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      setConnected(false);
    };
  }, [room, addMessage, setConnected, addReaction, setPinnedMessage, setActivePoll, updatePollVotes]);

  // Load chat history + active poll + pinned message
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat/history?streamId=${streamId}`);
        if (res.ok) {
          const data = await res.json();
          useChatStore.getState().setMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              content: m.content,
              username: m.username || "Anonymous",
              avatarUrl: m.avatarUrl,
              isBot: m.isBot,
              isFlagged: m.isFlagged,
              createdAt: new Date(m.createdAt),
            }))
          );
          if (data.pinnedMessage) setPinnedMessage(data.pinnedMessage);
        }
      } catch { /* silent */ }
    }
    async function loadPoll() {
      try {
        const res = await fetch(`/api/polls?streamId=${streamId}`);
        if (res.ok) {
          const { poll } = await res.json();
          setActivePoll(poll);
        }
      } catch { /* silent */ }
    }
    loadHistory();
    loadPoll();
  }, [streamId, setPinnedMessage, setActivePoll]);

  // Handle slash commands
  const processCommand = useCallback(
    async (raw: string): Promise<{ error?: string; handled: boolean }> => {
      if (!raw.startsWith("/")) return { handled: false };
      const parts = raw.slice(1).split(" ");
      const cmd = parts[0].toLowerCase();
      const arg = parts[1]?.replace(/^@/, "");

      if (cmd === "shoutout" && arg) {
        const content = `👋 Shoutout to @${arg}! Go check them out!`;
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, streamId }),
        });
        if (!res.ok) return { error: "Failed to send shoutout.", handled: true };
        const data = await res.json();
        broadcast({ type: "chat", id: data.messageId, content, username: session?.user?.name ?? "Streamer", avatarUrl: session?.user?.image, isBot: false, createdAt: Date.now() });
        return { handled: true };
      }

      if (!isStreamer) return { error: "Unknown command.", handled: true };

      if ((cmd === "ban" || cmd === "timeout") && arg) {
        setBanning(true);
        const mins = cmd === "timeout" ? Number(parts[2]) || 10 : 0;
        await fetch("/api/chat/ban", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: arg, reason: parts.slice(cmd === "timeout" ? 3 : 2).join(" "), timeoutMinutes: mins }),
        });
        setBanning(false);
        return { handled: true };
      }
      if (cmd === "unban" && arg) {
        await fetch("/api/chat/ban", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: arg, unban: true }) });
        return { handled: true };
      }
      if (cmd === "pin") {
        const msg = parts.slice(1).join(" ");
        await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinnedMessage: msg }) });
        setPinnedMessage(msg);
        broadcast({ type: "pinned", message: msg });
        return { handled: true };
      }
      if (cmd === "unpin") {
        await fetch("/api/user/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinnedMessage: "" }) });
        setPinnedMessage("");
        broadcast({ type: "pinned", message: "" });
        return { handled: true };
      }
      return { error: "Unknown command.", handled: true };
    },
    [broadcast, isStreamer, session, streamId, setPinnedMessage]
  );

  // Send a message
  const handleSend = useCallback(
    async (content: string): Promise<{ error?: string }> => {
      if (!room || !isSignedIn || !session?.user) return { error: "You must be signed in to chat" };
      if (content.startsWith("/")) {
        const result = await processCommand(content);
        if (result.handled) return result.error ? { error: result.error } : {};
      }
      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, streamId }),
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Message was not sent" };
        broadcast({ type: "chat", id: data.messageId, content, username: session.user.name ?? session.user.email ?? "User", avatarUrl: session.user.image, isBot: false, createdAt: Date.now() });
        return {};
      } catch {
        return { error: "Failed to send message" };
      }
    },
    [room, isSignedIn, session, streamId, broadcast, processCommand]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Stream Chat</h2>
        {isStreamer && banning && <Shield className="h-3.5 w-3.5 text-muted-foreground animate-pulse ml-1" />}
        <span className="ml-auto text-xs text-muted-foreground">{messages.length} messages</span>
      </div>

      {/* Pinned message */}
      <PinnedMessage message={pinnedMessage} />

      {/* Poll widget */}
      <div className="border-b border-border px-3 py-2">
        <PollWidget streamId={streamId} isStreamer={isStreamer} />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll py-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {/* Reactions bar */}
      {isSignedIn && (
        <div className="border-t border-border px-3 pt-2">
          <div className="flex items-center gap-1 flex-wrap mb-1">
            <button onClick={() => setShowReactions((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <SmilePlus className="h-3.5 w-3.5" />
              React
            </button>
            {showReactions && REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { addReaction(emoji); broadcast({ type: "reaction", emoji }); }}
                className="rounded px-1.5 py-0.5 text-base hover:bg-secondary transition-colors active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={!isSignedIn} />

      {isStreamer && (
        <p className="px-3 pb-2 text-[10px] text-muted-foreground leading-relaxed">
          /pin &lt;msg&gt; · /unpin · /ban @user · /timeout @user [min] · /unban @user · /shoutout @user
        </p>
      )}
    </div>
  );
}

