import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChatMessage } from "@/lib/models/chatMessage";
import { Stream } from "@/lib/models/stream";
import { User } from "@/lib/models/user";
import { CHAT_HISTORY_LIMIT } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get("streamId");

    if (!streamId) {
      return NextResponse.json(
        { error: "streamId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const messages = await ChatMessage.find({ streamId, isFlagged: false })
      .populate("userId", "username name image")
      .sort({ createdAt: 1 })
      .limit(CHAT_HISTORY_LIMIT)
      .lean<any[]>();

    // Get streamer's pinned message (only if streamId is a valid ObjectId)
    let pinnedMessage = "";
    const isObjectId = /^[a-f\d]{24}$/i.test(streamId);
    if (isObjectId) {
      const stream = await Stream.findById(streamId).select("userId").lean<any>();
      if (stream?.userId) {
        const streamer = await User.findById(stream.userId).select("pinnedMessage").lean<any>();
        pinnedMessage = streamer?.pinnedMessage ?? "";
      }
    }

    return NextResponse.json({
      pinnedMessage,
      messages: messages.map((m) => ({
        id: m._id.toString(),
        content: m.content,
        username: m.userId?.name || m.userId?.username || "Anonymous",
        avatarUrl: m.userId?.image,
        isBot: m.isBot,
        isFlagged: m.isFlagged,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json(
      { error: "Failed to load chat history" },
      { status: 500 }
    );
  }
}
