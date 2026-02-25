import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Stream } from "@/lib/models/stream";
import { ChatMessage } from "@/lib/models/chatMessage";
import { Ban } from "@/lib/models/ban";
import { moderateMessage } from "@/lib/ai/moderate";
import { shouldBotRespond, generateBotResponse } from "@/lib/ai/chatbot";
import { getSiteSettings } from "@/lib/models/siteSettings";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, streamId } = await req.json();

    if (!content || !streamId) {
      return NextResponse.json({ error: "Content and streamId are required" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 characters)" }, { status: 400 });
    }

    await connectDB();

    const [dbUser, siteSettings] = await Promise.all([
      User.findById(session.user.id),
      getSiteSettings(),
    ]);

    // ── Resolve stream owner (only for real ObjectId streams) ───────────────
    const isObjectId = /^[a-f\d]{24}$/i.test(streamId);
    const stream = isObjectId ? await Stream.findById(streamId).lean<any>() : null;
    const streamOwnerId: string | null = stream?.userId?.toString() ?? null;
    const isStreamer = streamOwnerId === session.user.id;

    // ── Ban / timeout check ─────────────────────────────────────────────────
    if (streamOwnerId && !isStreamer) {
      const ban = await Ban.findOne({
        streamerId: streamOwnerId,
        bannedUserId: session.user.id,
      }).lean<any>();

      if (ban) {
        if (!ban.expiresAt) {
          return NextResponse.json({ error: "You are banned from this chat." }, { status: 403 });
        }
        if (new Date(ban.expiresAt) > new Date()) {
          const remaining = Math.ceil((new Date(ban.expiresAt).getTime() - Date.now()) / 60000);
          return NextResponse.json(
            { error: `You are timed out for ${remaining} more minute(s).` },
            { status: 403 }
          );
        }
        // Expired timeout — delete it
        await Ban.deleteOne({ _id: ban._id });
      }
    }

    // ── Slow-mode check ─────────────────────────────────────────────────────
    const streamerDoc = streamOwnerId
      ? await User.findById(streamOwnerId).select("slowModeSeconds pinnedMessage").lean<any>()
      : null;

    if (streamerDoc?.slowModeSeconds > 0 && !isStreamer) {
      const lastMsg = await ChatMessage.findOne({
        streamId,
        userId: session.user.id,
        isBot: false,
      })
        .sort({ createdAt: -1 })
        .select("createdAt")
        .lean<any>();

      if (lastMsg) {
        const elapsed = (Date.now() - new Date(lastMsg.createdAt).getTime()) / 1000;
        if (elapsed < streamerDoc.slowModeSeconds) {
          const wait = Math.ceil(streamerDoc.slowModeSeconds - elapsed);
          return NextResponse.json(
            { error: `Slow mode is on. Please wait ${wait}s before sending another message.` },
            { status: 429 }
          );
        }
      }
    }

    // ── Banned words check ──────────────────────────────────────────────────
    if (siteSettings.bannedWords?.length) {
      const lower = content.toLowerCase();
      const hit = siteSettings.bannedWords.find((w: string) => lower.includes(w));
      if (hit) {
        return NextResponse.json(
          { error: "Your message contains prohibited content.", flagged: true },
          { status: 400 }
        );
      }
    }

    // ── AI Moderation ───────────────────────────────────────────────────────
    const moderation = await moderateMessage(content, siteSettings.moderationThreshold ?? 0.5);

    if (!moderation.allowed) {
      if (dbUser) {
        await ChatMessage.create({ content, streamId, userId: dbUser._id, isFlagged: true });
      }
      return NextResponse.json(
        { error: moderation.message || "Message flagged by AI moderation", flagged: true, categories: moderation.categories },
        { status: 400 }
      );
    }

    // ── Save message ────────────────────────────────────────────────────────
    const message = await ChatMessage.create({ content, streamId, userId: dbUser?._id });

    // Check if bot should respond (non-blocking)
    if (shouldBotRespond(content) && stream) {
      handleBotResponse(stream, streamId, content).catch(console.error);
    }

    return NextResponse.json({ messageId: message.id });
  } catch (error) {
    console.error("Chat send error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

async function handleBotResponse(stream: any, streamId: string, triggerMessage: string) {
  const recentMessages = await ChatMessage.find({ streamId, isFlagged: false })
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

  await ChatMessage.create({ content: botResponse, streamId, isBot: true });
}
