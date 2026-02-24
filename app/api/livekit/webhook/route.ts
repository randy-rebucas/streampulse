import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";

const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const authorization = req.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await receiver.receive(body, authorization);

    await connectDB();

    if (event.event === "room_started") {
      const roomName = event.room?.name;
      if (roomName) {
        await Stream.findByIdAndUpdate(roomName, {
          isLive: true,
          startedAt: new Date(),
        });
      }
    }

    if (event.event === "room_finished") {
      const roomName = event.room?.name;
      if (roomName) {
        await Stream.findByIdAndUpdate(roomName, {
          isLive: false,
          endedAt: new Date(),
          viewerCount: 0,
        });

        // Trigger summary generation
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          await fetch(`${appUrl}/api/ai/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ streamId: roomName }),
          });
        } catch (summaryErr) {
          console.error("Summary generation failed (non-fatal):", summaryErr);
        }
      }
    }

    if (event.event === "participant_joined") {
      const roomName = event.room?.name;
      const participantIdentity = event.participant?.identity;
      if (roomName) {
        // Fetch stream to get streamer identity so we don't count the streamer as a viewer
        const stream = await Stream.findById(roomName);
        if (stream && participantIdentity === stream.userId.toString()) {
          // This is the streamer joining — skip viewer count increment
        } else if (stream) {
          const updated = await Stream.findByIdAndUpdate(
            roomName,
            { $inc: { viewerCount: 1 } },
            { new: true }
          );
          if (updated && updated.viewerCount > updated.peakViewers) {
            await Stream.findByIdAndUpdate(roomName, {
              peakViewers: updated.viewerCount,
            });
          }
        }
      }
    }

    if (event.event === "participant_left") {
      const roomName = event.room?.name;
      const participantIdentity = event.participant?.identity;
      if (roomName) {
        const stream = await Stream.findById(roomName);
        if (stream && participantIdentity !== stream.userId.toString()) {
          // Prevent going below 0
          await Stream.findByIdAndUpdate(roomName, [
            { $set: { viewerCount: { $max: [0, { $subtract: ["$viewerCount", 1] }] } } },
          ]);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
