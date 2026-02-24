import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";
import { StreamSummary } from "@/lib/models/streamSummary";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;

    await connectDB();

    const stream = await Stream.findById(streamId)
      .populate("userId", "_id username name image")
      .lean<any>();

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    const summary = await StreamSummary.findOne({ streamId: stream._id }).lean<any>();

    const formatted = {
      ...stream,
      id: stream._id.toString(),
      user: stream.userId
        ? {
            id: stream.userId._id?.toString(),
            username: stream.userId.username,
            name: stream.userId.name,
            image: stream.userId.image,
          }
        : null,
      summary: summary ? { ...summary, id: summary._id.toString() } : null,
    };

    return NextResponse.json({ stream: formatted });
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stream" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { streamId } = await params;
    await connectDB();

    const stream = await Stream.findById(streamId);
    if (!stream) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    if (stream.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const allowed = ["isLive", "title", "description", "tags", "endedAt", "watchPartyQueue", "watchPartyQueueIndex"];
    const update: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    // Auto-set endedAt when ending the stream
    if (body.isLive === false && !update.endedAt) {
      update.endedAt = new Date();
    }

    const updated = await Stream.findByIdAndUpdate(streamId, update, { new: true }).lean<any>();
    return NextResponse.json({ stream: { ...updated, id: updated._id.toString() } });
  } catch (error) {
    console.error("Stream update error:", error);
    return NextResponse.json({ error: "Failed to update stream" }, { status: 500 });
  }
}
