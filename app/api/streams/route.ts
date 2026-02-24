import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const search = req.nextUrl.searchParams.get("search") || "";
    const liveOnly = req.nextUrl.searchParams.get("live") === "true";
    const userId = req.nextUrl.searchParams.get("userId") || "";

    // Restrict userId filter to authenticated user's own ID only
    if (userId && (!session?.user?.id || session.user.id !== userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const filter: Record<string, any> = {};
    if (liveOnly) filter.isLive = true;
    if (userId) filter.userId = userId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $in: [search] } },
      ];
    }

    const streams = await Stream.find(filter)
      .populate("userId", "username name image")
      .sort({ isLive: -1, viewerCount: -1, createdAt: -1 })
      .limit(50)
      .lean<any[]>();

    const formatted = streams.map((s) => ({
      ...s,
      id: s._id.toString(),
      user: s.userId
        ? {
            username: (s.userId as any).username,
            name: (s.userId as any).name,
            image: (s.userId as any).image,
          }
        : null,
    }));

    return NextResponse.json({ streams: formatted });
  } catch (error) {
    console.error("Streams list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, tags } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const dbUser = await User.findById(session.user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stream = await Stream.create({
      title,
      description,
      tags: tags || [],
      userId: dbUser._id,
    });

    return NextResponse.json({ stream: { ...stream.toObject(), id: stream.id } });
  } catch (error) {
    console.error("Stream create error:", error);
    return NextResponse.json(
      { error: "Failed to create stream" },
      { status: 500 }
    );
  }
}
