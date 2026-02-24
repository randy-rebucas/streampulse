import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { db } from "@/lib/db";

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

    if (event.event === "room_started") {
      const roomName = event.room?.name;
      if (roomName) {
        await db.stream.updateMany({
          where: { id: roomName },
          data: { isLive: true, startedAt: new Date() },
        });
      }
    }

    if (event.event === "room_finished") {
      const roomName = event.room?.name;
      if (roomName) {
        await db.stream.updateMany({
          where: { id: roomName },
          data: { isLive: false, endedAt: new Date(), viewerCount: 0 },
        });

        // Trigger summary generation
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          fetch(`${appUrl}/api/ai/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ streamId: roomName }),
          });
        } catch {
          // Non-blocking: summary generation failure shouldn't affect webhook
        }
      }
    }

    if (event.event === "participant_joined") {
      const roomName = event.room?.name;
      if (roomName) {
        await db.stream.updateMany({
          where: { id: roomName },
          data: {
            viewerCount: { increment: 1 },
          },
        });
        // Update peak viewers
        const stream = await db.stream.findFirst({ where: { id: roomName } });
        if (stream && stream.viewerCount > stream.peakViewers) {
          await db.stream.update({
            where: { id: roomName },
            data: { peakViewers: stream.viewerCount },
          });
        }
      }
    }

    if (event.event === "participant_left") {
      const roomName = event.room?.name;
      if (roomName) {
        await db.stream.updateMany({
          where: { id: roomName },
          data: {
            viewerCount: { decrement: 1 },
          },
        });
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
