"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useRemoteParticipants,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Radio, WifiOff, Loader2 } from "lucide-react";

interface StreamPlayerProps {
  token: string;
  serverUrl: string;
  streamerIdentity: string;
}

function VideoDisplay({
  streamerIdentity,
}: {
  streamerIdentity: string;
}) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  const streamerTrack = tracks.find(
    (t) => t.participant.identity === streamerIdentity
  );

  if (!streamerTrack) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Waiting for stream to start...
        </p>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={streamerTrack}
      className="h-full w-full object-contain"
    />
  );
}

function ViewerCount() {
  const participants = useRemoteParticipants();
  return (
    <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
      <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
      <span className="text-xs font-medium text-white">
        {participants.length + 1} watching
      </span>
    </div>
  );
}

export function StreamPlayer({
  token,
  serverUrl,
  streamerIdentity,
}: StreamPlayerProps) {
  const [isConnected, setIsConnected] = useState(false);

  if (!token || !serverUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-secondary">
        <div className="flex flex-col items-center gap-2">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Stream unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onConnected={() => setIsConnected(true)}
      onDisconnected={() => setIsConnected(false)}
      className="relative aspect-video overflow-hidden rounded-xl bg-black"
    >
      <VideoDisplay streamerIdentity={streamerIdentity} />

      {/* Overlay controls */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded bg-live px-2 py-0.5">
          <Radio className="h-3 w-3 text-white" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>
        <ViewerCount />
      </div>
    </LiveKitRoom>
  );
}
