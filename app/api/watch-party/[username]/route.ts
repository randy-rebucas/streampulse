import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

/** GET /api/watch-party/[username] — public endpoint to fetch a user's watch party queue */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  await connectDB();
  const user = await User.findOne({ username }).select("watchPartyQueue username name image").lean<any>();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    queue: user.watchPartyQueue ?? [],
    user: {
      username: user.username,
      name: user.name ?? null,
      image: user.image ?? null,
    },
  });
}
