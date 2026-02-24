import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

    const messages = await db.chatMessage.findMany({
      where: {
        streamId,
        isFlagged: false,
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: CHAT_HISTORY_LIMIT,
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        username: m.user?.displayName || m.user?.username || "Anonymous",
        avatarUrl: m.user?.avatarUrl,
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
