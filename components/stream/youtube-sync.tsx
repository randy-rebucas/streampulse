"use client";

import { useEffect } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";
import { useChatStore } from "@/stores/chat-store";

/**
 * Invisible component — subscribes to LiveKit data channel for YouTube watch-party
 * events only. Must be mounted inside a <LiveKitRoom>. Works on all screen sizes,
 * ensuring late-joining viewers and mobile users receive the queue state.
 */
export function YouTubeSync() {
  const room = useRoomContext();
  const setYoutubeQueue = useChatStore((s) => s.setYoutubeQueue);

  useEffect(() => {
    if (!room) return;

    const handler = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "youtube") {
          if (Array.isArray(data.queue)) {
            // New queue-based format
            setYoutubeQueue(data.queue, data.index ?? 0);
          } else {
            // Legacy single-video format (backward compat)
            const id = data.videoId ?? null;
            setYoutubeQueue(id ? [id] : [], 0);
          }
        }
      } catch {
        // Malformed packet — ignore
      }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room, setYoutubeQueue]);

  return null;
}
