import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Follow } from "@/lib/models/follow";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const session = await auth();

  await connectDB();
  const streamer = await User.findOne({ username }).select("_id name username image bio slowModeSeconds pinnedMessage").lean<any>();
  if (!streamer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const followerCount = await Follow.countDocuments({ streamerId: streamer._id });
  let isFollowing = false;

  if (session?.user?.id && session.user.id !== streamer._id.toString()) {
    isFollowing = !!(await Follow.exists({ followerId: session.user.id, streamerId: streamer._id }));
  }

  return NextResponse.json({ followerCount, isFollowing });
}

/** POST toggles follow/unfollow — returns { following: boolean, followerCount: number } */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await params;

  await connectDB();
  const streamer = await User.findOne({ username }).select("_id").lean<any>();
  if (!streamer) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (session.user.id === streamer._id.toString()) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await Follow.findOne({ followerId: session.user.id, streamerId: streamer._id });
  let following: boolean;

  if (existing) {
    await existing.deleteOne();
    following = false;
  } else {
    await Follow.create({ followerId: session.user.id, streamerId: streamer._id });
    following = true;
  }

  const followerCount = await Follow.countDocuments({ streamerId: streamer._id });
  return NextResponse.json({ following, followerCount });
}
