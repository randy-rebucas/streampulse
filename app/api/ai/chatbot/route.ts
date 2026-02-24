import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Stream } from "@/lib/models/stream";
import { ChatMessage } from "@/lib/models/chatMessage";
import { generateBotResponse } from "@/lib/ai/chatbot";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { streamId, message } = await req.json();

    if (!streamId || !message) {
      return NextResponse.json(
        { error: "streamId and message are required" },
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

    const recentChatMessages = await ChatMessage.find({
      streamId,
      isFlagged: false,
    })
      .populate("userId", "username")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean<any[]>();

    const recentMessages = recentChatMessages.reverse().map((m) => ({
      username: m.userId?.username || (m.isBot ? "AI Bot" : "Anonymous"),
      content: m.content,
    }));

    const botResponse = await generateBotResponse(
      stream.title,
      stream.description || "",
      recentMessages,
      message
    );

    // Save bot response
    const saved = await ChatMessage.create({
      content: botResponse,
      streamId,
      isBot: true,
    });

    return NextResponse.json({
      messageId: saved.id,
      content: botResponse,
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { error: "Failed to generate bot response" },
      { status: 500 }
    );
  }
}
