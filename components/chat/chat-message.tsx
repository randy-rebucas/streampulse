"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/stores/chat-store";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`group flex gap-2 px-4 py-1.5 hover:bg-secondary/50 transition-colors ${
        message.isBot ? "bg-primary/5" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
          message.isBot
            ? "bg-primary/20 text-primary"
            : "bg-secondary text-muted-foreground"
        }`}
      >
        {message.isBot ? (
          <Bot className="h-3.5 w-3.5" />
        ) : message.avatarUrl ? (
          <img
            src={message.avatarUrl}
            alt={message.username}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          message.username.charAt(0).toUpperCase()
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span className="inline">
          {message.isBot ? (
            <span className="text-sm font-semibold text-primary">StreamPulse AI</span>
          ) : message.userSlug ? (
            <Link
              href={`/u/${message.userSlug}`}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {message.username}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground">{message.username}</span>
          )}
          {message.isBot && (
            <span className="ml-1 inline-flex items-center rounded bg-primary/20 px-1 py-0.5 text-[10px] font-bold text-primary align-middle">
              BOT
            </span>
          )}
          <span className="ml-2 text-sm text-foreground/80">
            {message.content}
          </span>
        </span>
      </div>
    </div>
  );
}
