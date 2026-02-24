import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

    const stream = await db.stream.findUnique({
      where: { id: streamId },
      include: {
        chatMessages: {
          where: { isFlagged: false },
          orderBy: { createdAt: "asc" },
          include: { user: true },
        },
      },
    });

    if (!stream) {
      return NextResponse.json(
        { error: "Stream not found" },
        { status: 404 }
      );
    }

    if (stream.chatMessages.length < 5) {
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

    const chatMessages = stream.chatMessages.map((m) => ({
      content: m.content,
      username: m.user?.username || (m.isBot ? "AI Bot" : "Anonymous"),
      createdAt: m.createdAt,
      isBot: m.isBot,
    }));

    const summary = await generateStreamSummary(
      stream.title,
      stream.description || "",
      chatMessages,
      durationMinutes
    );

    // Save or update summary
    const saved = await db.streamSummary.upsert({
      where: { streamId },
      create: {
        streamId,
        title: summary.title,
        tldr: summary.tldr,
        keyTopics: summary.keyTopics,
        highlights: summary.highlights as any,
        sentiment: summary.sentiment,
      },
      update: {
        title: summary.title,
        tldr: summary.tldr,
        keyTopics: summary.keyTopics,
        highlights: summary.highlights as any,
        sentiment: summary.sentiment,
      },
    });

    return NextResponse.json({ summary: saved });
  } catch (error) {
    console.error("Summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
