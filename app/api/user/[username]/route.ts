import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";
import { Follow } from "@/lib/models/follow";
import { ScheduledStream } from "@/lib/models/scheduledStream";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const session = await auth();
  await connectDB();

  const user = await User.findOne({ username })
    .select("_id name username image bio isStreamer createdAt watchPartyQueue")
    .lean<any>();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [followerCount, pastStreams, scheduled, liveStream, isFollowingCheck] = await Promise.all([
    Follow.countDocuments({ streamerId: user._id }),
    Stream.find({ userId: user._id, isLive: false })
      .sort({ startedAt: -1 })
      .limit(12)
      .select("_id title description tags startedAt endedAt peakViewers viewerCount")
      .lean<any[]>(),
    ScheduledStream.find({ userId: user._id, scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(5)
      .lean<any[]>(),
    Stream.findOne({ userId: user._id, isLive: true }).select("_id").lean<any>(),
    session?.user?.id
      ? Follow.exists({ followerId: session.user.id, streamerId: user._id })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    image: user.image,
    bio: user.bio ?? null,
    followerCount,
    isFollowing: !!isFollowingCheck,
    isLive: !!liveStream,
    liveStreamId: liveStream?._id?.toString() ?? null,
    pastStreams: pastStreams.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      tags: s.tags ?? [],
      peakViewers: s.peakViewers ?? 0,
      endedAt: s.endedAt ?? null,
    })),
    scheduled: scheduled.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      description: s.description ?? "",
      scheduledAt: s.scheduledAt,
      tags: s.tags ?? [],
    })),
    watchPartyQueue: user.watchPartyQueue ?? [],
  });
}
