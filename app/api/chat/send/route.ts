import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateMessage } from "@/lib/ai/moderate";
import { shouldBotRespond, generateBotResponse } from "@/lib/ai/chatbot";

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
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

    // Find the user in our DB
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
    });

    // Moderate the message
    const moderation = await moderateMessage(content);

    if (!moderation.allowed) {
      // Save flagged message for review
      if (dbUser) {
        await db.chatMessage.create({
          data: {
            content,
            streamId,
            userId: dbUser.id,
            isFlagged: true,
          },
        });
      }

      return NextResponse.json(
        {
          error:
            moderation.message || "Message flagged by AI moderation",
          flagged: true,
          categories: moderation.categories,
        },
        { status: 400 }
      );
    }

    // Save message
    const message = await db.chatMessage.create({
      data: {
        content,
        streamId,
        userId: dbUser?.id,
      },
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

  if (!stream) return;

  const recentMessages = stream.chatMessages.reverse().map((m) => ({
    username: m.user?.username || "Anonymous",
    content: m.content,
  }));

  const botResponse = await generateBotResponse(
    stream.title,
    stream.description || "",
    recentMessages,
    triggerMessage
  );

  // Save bot message to DB
  await db.chatMessage.create({
    data: {
      content: botResponse,
      streamId,
      isBot: true,
    },
  });
}
