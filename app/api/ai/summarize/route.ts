import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/auth";
import { Stream } from "@/lib/models/stream";
import { ChatMessage } from "@/lib/models/chatMessage";
import { StreamSummary } from "@/lib/models/streamSummary";
import { generateStreamSummary } from "@/lib/ai/summarize";

// Internal-only secret so the webhook can trigger summarization
// without exposing the full auth session flow.
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Allow requests from:
    // 1. Webhook with internal secret
    // 2. Same-origin client requests from the authenticated stream owner
    const internalToken = req.headers.get("x-internal-secret");
    const isTrustedInternal = INTERNAL_SECRET && internalToken === INTERNAL_SECRET;

    let sessionUserId: string | null = null;
    if (!isTrustedInternal) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      sessionUserId = session.user.id;
    }

    const { streamId } = await req.json();

    if (!streamId || !/^[a-f\d]{24}$/i.test(streamId)) {
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

    // If called by an authenticated user, verify they own the stream
    if (sessionUserId && stream.userId?.toString() !== sessionUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
