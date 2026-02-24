"use client";

import { useState } from "react";
import { useRoomContext, useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Loader2,
} from "lucide-react";

interface StreamControlsProps {
  onEndStream: () => void;
}

export function StreamControls({ onEndStream }: StreamControlsProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const isConnected = connectionState === ConnectionState.Connected;
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleMic = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicOn);
      setIsMicOn(!isMicOn);
    } catch (e) {
      console.error("Failed to toggle mic:", e);
    }
  };

  const toggleCamera = async () => {
    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn);
      setIsCameraOn(!isCameraOn);
    } catch (e) {
      console.error("Failed to toggle camera:", e);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await room.localParticipant.setScreenShareEnabled(!isScreenSharing);
      setIsScreenSharing(!isScreenSharing);
    } catch (e) {
      console.error("Failed to toggle screen share:", e);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border p-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Connecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 rounded-xl bg-card border border-border p-3">
      <button
        onClick={toggleMic}
        className={`rounded-lg p-3 transition-colors ${
          isMicOn
            ? "bg-secondary hover:bg-secondary/80 text-foreground"
            : "bg-destructive/20 text-destructive hover:bg-destructive/30"
        }`}
        title={isMicOn ? "Mute microphone" : "Unmute microphone"}
      >
        {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      <button
        onClick={toggleCamera}
        className={`rounded-lg p-3 transition-colors ${
          isCameraOn
            ? "bg-secondary hover:bg-secondary/80 text-foreground"
            : "bg-destructive/20 text-destructive hover:bg-destructive/30"
        }`}
        title={isCameraOn ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraOn ? (
          <Video className="h-5 w-5" />
        ) : (
          <VideoOff className="h-5 w-5" />
        )}
      </button>

      <button
        onClick={toggleScreenShare}
        className={`rounded-lg p-3 transition-colors ${
          isScreenSharing
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "bg-secondary hover:bg-secondary/80 text-foreground"
        }`}
        title={isScreenSharing ? "Stop screen share" : "Share screen"}
      >
        <MonitorUp className="h-5 w-5" />
      </button>

      <div className="mx-2 h-8 w-px bg-border" />

      <button
        onClick={onEndStream}
        className="rounded-lg bg-destructive p-3 text-white hover:bg-destructive/90 transition-colors"
        title="End stream"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
