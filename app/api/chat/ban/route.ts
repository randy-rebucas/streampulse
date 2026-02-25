import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Ban } from "@/lib/models/ban";

/** GET — list bans for the current streamer's room */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const bans = await Ban.find({ streamerId: session.user.id })
    .sort({ createdAt: -1 })
    .lean<any[]>();

  return NextResponse.json({
    bans: bans.map((b) => ({
      id: b._id.toString(),
      bannedUserId: b.bannedUserId.toString(),
      bannedUsername: b.bannedUsername,
      reason: b.reason,
      expiresAt: b.expiresAt,
      createdAt: b.createdAt,
    })),
  });
}

/**
 * POST — ban or timeout a user from the current streamer's chat.
 * Body: { username: string, reason?: string, timeoutMinutes?: number }
 * Omit timeoutMinutes (or pass 0) for a permanent ban.
 * Pass -1 for username to unban.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, reason, timeoutMinutes, unban } = await req.json();
  if (!username) return NextResponse.json({ error: "username is required." }, { status: 400 });

  await connectDB();
  const target = await User.findOne({ username }).select("_id username").lean<any>();
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (unban) {
    await Ban.deleteOne({ streamerId: session.user.id, bannedUserId: target._id });
    return NextResponse.json({ ok: true, unbanned: true });
  }

  const expiresAt =
    timeoutMinutes && timeoutMinutes > 0
      ? new Date(Date.now() + timeoutMinutes * 60 * 1000)
      : null;

  await Ban.findOneAndUpdate(
    { streamerId: session.user.id, bannedUserId: target._id },
    {
      $set: {
        bannedUsername: target.username,
        reason: reason ?? "",
        expiresAt,
      },
    },
    { upsert: true }
  );

  return NextResponse.json({
    ok: true,
    bannedUsername: target.username,
    expiresAt,
    isPermanent: !expiresAt,
  });
}
