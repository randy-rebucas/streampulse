import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  await connectDB();

  const streams = await Stream.find({ tags: decodedTag, isLive: true })
    .populate("userId", "username name image")
    .sort({ viewerCount: -1 })
    .limit(48)
    .lean<any[]>();

  const formatted = streams.map((s) => ({
    id: s._id.toString(),
    title: s.title,
    description: s.description,
    viewerCount: s.viewerCount,
    peakViewers: s.peakViewers,
    tags: s.tags,
    isLive: s.isLive,
    startedAt: s.startedAt,
    thumbnailUrl: s.thumbnailUrl ?? null,
    user: s.userId
      ? {
          id: s.userId._id?.toString(),
          username: s.userId.username,
          name: s.userId.name,
          image: s.userId.image,
        }
      : null,
  }));

  return NextResponse.json({ tag: decodedTag, streams: formatted });
}
