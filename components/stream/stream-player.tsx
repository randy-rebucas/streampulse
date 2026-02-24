"use client";

import {
  VideoTrack,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Radio, Loader2 } from "lucide-react";

interface StreamPlayerProps {
  streamerIdentity: string;
}

function ViewerCount() {
  const participants = useRemoteParticipants();
  // Remote participants = viewers; does not include local (ourselves)
  return (
    <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1">
      <span className="h-2 w-2 rounded-full bg-live animate-pulse-live" />
      <span className="text-xs font-medium text-white">
        {participants.length} watching
      </span>
    </div>
  );
}

/**
 * Must be rendered inside a <LiveKitRoom> — uses room context hooks directly.
 * The parent watch page provides the single shared LiveKitRoom connection.
 */
export function StreamPlayer({ streamerIdentity }: StreamPlayerProps) {
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
    <div className="relative h-full">
      <VideoTrack
        trackRef={streamerTrack}
        className="h-full w-full object-contain"
      />
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded bg-live px-2 py-0.5">
          <Radio className="h-3 w-3 text-white" />
          <span className="text-xs font-bold text-white">LIVE</span>
        </div>
        <ViewerCount />
      </div>
    </div>
  );
}
