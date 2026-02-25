import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";

/** GET /api/watch-party/[username] — public endpoint to fetch a user's watch party queue.
 *  If the user has an active live stream with a watch-party queue running, that takes
 *  precedence (returns liveQueue + liveQueueIndex). Otherwise falls back to the static
 *  savedQueue stored on the user profile. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  await connectDB();
  const user = await User.findOne({ username })
    .select("watchPartyQueue username name image")
    .lean<any>();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check for an active live stream that has a watch-party queue playing
  const liveStream = await Stream.findOne({
    userId: user._id,
    isLive: true,
    watchPartyQueue: { $exists: true, $ne: [] },
  })
    .select("_id watchPartyQueue watchPartyQueueIndex")
    .lean<any>();

  const hostInfo = {
    username: user.username,
    name: user.name ?? null,
    image: user.image ?? null,
  };

  if (liveStream?.watchPartyQueue?.length) {
    return NextResponse.json({
      queue: liveStream.watchPartyQueue as string[],
      queueIndex: liveStream.watchPartyQueueIndex ?? 0,
      isLive: true,
      streamId: liveStream._id.toString(),
      user: hostInfo,
    });
  }

  return NextResponse.json({
    queue: user.watchPartyQueue ?? [],
    queueIndex: 0,
    isLive: false,
    streamId: null,
    user: hostInfo,
  });
}
