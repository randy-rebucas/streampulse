import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

/** GET /api/user/watch-party — returns the authed user's watch party queue */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).select("watchPartyQueue username name image").lean<any>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ queue: user.watchPartyQueue ?? [] });
}

/** PUT /api/user/watch-party — saves (overwrites) the user's watch party queue */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { queue } = await req.json();
  if (!Array.isArray(queue)) {
    return NextResponse.json({ error: "queue must be an array" }, { status: 400 });
  }

  await connectDB();
  await User.findByIdAndUpdate(session.user.id, { $set: { watchPartyQueue: queue } });

  return NextResponse.json({ ok: true });
}
