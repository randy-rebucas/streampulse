import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";
import { ChatMessage } from "@/lib/models/chatMessage";
import { moderateMessage } from "@/lib/ai/moderate";
import { shouldBotRespond, generateBotResponse } from "@/lib/ai/chatbot";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, streamId } = await req.json();

    if (!content || !streamId) {
      return NextResponse.json(
        { error: "Content and streamId are required" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "Message too long (max 500 characters)" },
        { status: 400 }
      );
    }

    await connectDB();

    const dbUser = await User.findById(session.user.id);

    // Moderate the message
    const moderation = await moderateMessage(content);

    if (!moderation.allowed) {
      if (dbUser) {
        await ChatMessage.create({
          content,
          streamId,
          userId: dbUser._id,
          isFlagged: true,
        });
      }

      return NextResponse.json(
        {
          error: moderation.message || "Message flagged by AI moderation",
          flagged: true,
          categories: moderation.categories,
        },
        { status: 400 }
      );
    }

    // Save message
    const message = await ChatMessage.create({
      content,
      streamId,
      userId: dbUser?._id,
    });

    // Check if bot should respond (non-blocking)
    if (shouldBotRespond(content)) {
      handleBotResponse(streamId, content).catch(console.error);
    }

    return NextResponse.json({ messageId: message.id });
  } catch (error) {
    console.error("Chat send error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

async function handleBotResponse(streamId: string, triggerMessage: string) {
  const stream = await Stream.findById(streamId).lean<any>();
  if (!stream) return;

  const recentMessages = await ChatMessage.find({
    streamId,
    isFlagged: false,
  })
    .populate("userId", "username")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean<any[]>();

  const messages = recentMessages.reverse().map((m) => ({
    username: m.userId?.username || "Anonymous",
    content: m.content,
  }));

  const botResponse = await generateBotResponse(
    stream.title,
    stream.description || "",
    messages,
    triggerMessage
  );

  await ChatMessage.create({
    content: botResponse,
    streamId,
    isBot: true,
  });
}
