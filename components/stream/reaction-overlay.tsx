"use client";

import { useEffect } from "react";
import { useChatStore } from "@/stores/chat-store";

interface ReactionOverlayProps {
  /** When provided, broadcasts reactions via LiveKit */
  onBroadcast?: (emoji: string) => void;
  isStreamer?: boolean;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👏", "😮", "🎉"];

export function ReactionOverlay({ onBroadcast }: ReactionOverlayProps) {
  const { reactions, addReaction, removeReaction } = useChatStore();

  // Remove reaction particles after animation completes
  useEffect(() => {
    if (reactions.length === 0) return;
    const latest = reactions[reactions.length - 1];
    const timer = setTimeout(() => removeReaction(latest.id), 3000);
    return () => clearTimeout(timer);
  }, [reactions, removeReaction]);

  const handleReact = (emoji: string) => {
    addReaction(emoji);
    onBroadcast?.(emoji);
  };

  return (
    <>
      {/* Floating reaction particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {reactions.map((r) => (
          <span
            key={r.id}
            className="absolute bottom-16 text-2xl animate-reaction-float select-none"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Reaction buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            className="rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-base hover:bg-secondary hover:scale-110 transition-all active:scale-95 backdrop-blur-sm"
            aria-label={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}
