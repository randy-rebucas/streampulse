"use client";

import { Pin } from "lucide-react";

interface PinnedMessageProps {
  message: string;
}

export function PinnedMessage({ message }: PinnedMessageProps) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-3 py-2.5">
      <Pin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
      <p className="text-xs text-foreground leading-relaxed line-clamp-2">{message}</p>
    </div>
  );
}
