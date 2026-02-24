import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";
import { ChatMessage } from "@/lib/models/chatMessage";
import { StreamSummary } from "@/lib/models/streamSummary";
import { generateStreamSummary } from "@/lib/ai/summarize";

export async function POST(req: NextRequest) {
  try {
    const { streamId } = await req.json();

    if (!streamId) {
      return NextResponse.json(
        { error: "streamId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const stream = await Stream.findById(streamId).lean<any>();

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    const chatMessages = await ChatMessage.find({ streamId, isFlagged: false })
      .populate("userId", "username")
      .sort({ createdAt: 1 })
      .lean<any[]>();

    if (chatMessages.length < 5) {
      return NextResponse.json(
        { error: "Not enough chat messages to generate a summary" },
        { status: 400 }
      );
    }

    // Calculate stream duration
    const startTime = stream.startedAt || stream.createdAt;
    const endTime = stream.endedAt || new Date();
    const durationMinutes = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 60000
    );

    const messages = chatMessages.map((m) => ({
      content: m.content,
      username: m.userId?.username || (m.isBot ? "AI Bot" : "Anonymous"),
      createdAt: m.createdAt,
      isBot: m.isBot,
    }));

    const summary = await generateStreamSummary(
      stream.title,
      stream.description || "",
      messages,
      durationMinutes
    );

    // Save or update summary
    const saved = await StreamSummary.findOneAndUpdate(
      { streamId },
      {
        $set: {
          title: summary.title,
          tldr: summary.tldr,
          keyTopics: summary.keyTopics,
          highlights: summary.highlights,
          sentiment: summary.sentiment,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ summary: { ...saved.toObject(), id: saved.id } });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
