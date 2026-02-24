"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind, RoomEvent } from "livekit-client";
import { MessageSquare } from "lucide-react";
import { useChatStore, type ChatMessage as ChatMessageType } from "@/stores/chat-store";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";

interface ChatPanelProps {
  streamId: string;
}

export function ChatPanel({ streamId }: ChatPanelProps) {
  const { user, isSignedIn } = useUser();
  const { messages, addMessage, setConnected } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const room = useRoomContext();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for incoming chat messages via LiveKit data channels
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (
      payload: Uint8Array,
      participant?: any,
      kind?: DataPacket_Kind,
      topic?: string
    ) => {
      try {
        const decoded = new TextDecoder().decode(payload);
        const data = JSON.parse(decoded);

        if (data.type === "chat") {
          const msg: ChatMessageType = {
            id: data.id || crypto.randomUUID(),
            content: data.content,
            username: data.username,
            avatarUrl: data.avatarUrl,
            isBot: data.isBot || false,
            isFlagged: false,
            createdAt: new Date(data.createdAt || Date.now()),
          };
          addMessage(msg);
        }
      } catch (e) {
        console.error("Failed to parse chat message:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    setConnected(true);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      setConnected(false);
    };
  }, [room, addMessage, setConnected]);

  // Load chat history
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
        }
      } catch (e) {
        console.error("Failed to load chat history:", e);
      }
    }
    loadHistory();
  }, [streamId]);

  // Send a message
  const handleSend = useCallback(
    async (content: string): Promise<{ error?: string }> => {
      if (!room || !isSignedIn || !user) {
        return { error: "You must be signed in to chat" };
      }

      try {
        // Send to API for moderation + persistence
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, streamId }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || "Message was not sent" };
        }

        // Broadcast via LiveKit data channel
        const chatData = JSON.stringify({
          type: "chat",
          id: data.messageId,
          content,
          username: user.username || user.firstName || "User",
          avatarUrl: user.imageUrl,
          isBot: false,
          createdAt: Date.now(),
        });

        const encoder = new TextEncoder();
        await room.localParticipant.publishData(
          encoder.encode(chatData),
          { reliable: true }
        );

        return {};
      } catch {
        return { error: "Failed to send message" };
      }
    },
    [room, isSignedIn, user, streamId]
  );

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Stream Chat</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scroll py-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={!isSignedIn} />
    </div>
  );
}
