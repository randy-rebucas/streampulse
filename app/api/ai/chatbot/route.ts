import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateBotResponse } from "@/lib/ai/chatbot";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { streamId, message } = await req.json();

    if (!streamId || !message) {
      return NextResponse.json(
        { error: "streamId and message are required" },
        { status: 400 }
      );
    }

    // Get stream info
    const stream = await db.stream.findUnique({
      where: { id: streamId },
      include: {
        chatMessages: {
          where: { isFlagged: false },
          orderBy: { createdAt: "desc" },
          take: 20,
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

    const recentMessages = stream.chatMessages.reverse().map((m) => ({
      username: m.user?.username || (m.isBot ? "AI Bot" : "Anonymous"),
      content: m.content,
    }));

    const botResponse = await generateBotResponse(
      stream.title,
      stream.description || "",
      recentMessages,
      message
    );

    // Save bot response
    const saved = await db.chatMessage.create({
      data: {
        content: botResponse,
        streamId,
        isBot: true,
      },
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
