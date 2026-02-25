import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";
import { createGuestStreamerToken } from "@/lib/livekit";

/**
 * POST — generate a short-lived co-stream link token for a guest.
 * Only the room owner (streamer) can request this.
 * Returns { guestLink } which the host can share.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streamId } = await req.json();
  if (!streamId) return NextResponse.json({ error: "streamId is required." }, { status: 400 });

  await connectDB();
  const stream = await Stream.findById(streamId).lean<any>();
  if (!stream) return NextResponse.json({ error: "Stream not found." }, { status: 404 });
  if (stream.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a random guest identity so links aren't reusable with the same identity
  const guestIdentity = `guest-${crypto.randomUUID().slice(0, 8)}`;
  const token = await createGuestStreamerToken(streamId, guestIdentity, "Guest");

  const guestLink = `${process.env.NEXTAUTH_URL ?? ""}/watch/${streamId}?guestToken=${token}`;

  return NextResponse.json({ guestLink, token, guestIdentity });
}
