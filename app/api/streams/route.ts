import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";
import { StreamSummary } from "@/lib/models/streamSummary";

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

    // If fetching for a specific user (dashboard analytics), include summaries
    let summaryMap: Map<string, any> = new Map();
    if (userId) {
      const ids = streams.map((s) => s._id);
      const summaries = await StreamSummary.find({ streamId: { $in: ids } }).lean<any[]>();
      summaries.forEach((s) => summaryMap.set(s.streamId.toString(), s));
    }

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
      summary: summaryMap.get(s._id.toString()) ?? null,
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
