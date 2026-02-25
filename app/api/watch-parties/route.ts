import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";

export interface WatchPartyItem {
  videoUrl: string;
  isLive: boolean;
  streamId: string | null;
  user: { username: string; name: string | null; image: string | null };
}

/**
 * GET /api/watch-parties
 * Returns a flat list of watch party video entries (one per queued video).
 * Live streams with a queue come first, then offline user queues.
 * Limited to 16 items total.
 */
export async function GET() {
  try {
    await connectDB();

    const items: WatchPartyItem[] = [];

    // 1. Active live streams with watch party queues
    const liveStreams = await Stream.find({
      isLive: true,
      watchPartyQueue: { $exists: true, $ne: [] },
    })
      .populate("userId", "username name image")
      .select("_id watchPartyQueue watchPartyQueueIndex userId")
      .limit(20)
      .lean<any[]>();

    for (const stream of liveStreams) {
      const queue: string[] = stream.watchPartyQueue ?? [];
      const idx: number = stream.watchPartyQueueIndex ?? 0;
      // Show the currently playing video, then next ones
      const ordered = [...queue.slice(idx), ...queue.slice(0, idx)];
      for (const videoUrl of ordered.slice(0, 2)) {
        items.push({
          videoUrl,
          isLive: true,
          streamId: stream._id.toString(),
          user: {
            username: stream.userId?.username ?? "",
            name: stream.userId?.name ?? null,
            image: stream.userId?.image ?? null,
          },
        });
      }
      if (items.length >= 16) break;
    }

    // 2. Offline users with saved queues
    if (items.length < 16) {
      const users = await User.find({ watchPartyQueue: { $exists: true, $ne: [] } })
        .select("username name image watchPartyQueue")
        .limit(30)
        .lean<any[]>();

      for (const user of users) {
        if (items.length >= 16) break;
        const queue: string[] = user.watchPartyQueue ?? [];
        items.push({
          videoUrl: queue[0],
          isLive: false,
          streamId: null,
          user: {
            username: user.username ?? "",
            name: user.name ?? null,
            image: user.image ?? null,
          },
        });
      }
    }

    return NextResponse.json({ items: items.slice(0, 16) });
  } catch (err) {
    console.error("[watch-parties] GET error:", err);
    return NextResponse.json({ items: [] });
  }
}
