"use client";

import { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { CHAT_MAX_LENGTH } from "@/lib/constants";

interface ChatInputProps {
  onSend: (message: string) => Promise<{ error?: string }>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    try {
      const result = await onSend(trimmed);
      if (result.error) {
        setError(result.error);
        setTimeout(() => setError(null), 5000);
      } else {
        setMessage("");
      }
    } catch {
      setError("Failed to send message");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border p-3">
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Sign in to chat" : "Send a message..."}
          disabled={disabled || sending}
          maxLength={CHAT_MAX_LENGTH}
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {message.length > CHAT_MAX_LENGTH * 0.8 && (
        <p className="mt-1 text-[10px] text-muted-foreground text-right">
          {message.length}/{CHAT_MAX_LENGTH}
        </p>
      )}
    </div>
  );
}
