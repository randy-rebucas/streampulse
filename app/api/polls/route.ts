import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Poll } from "@/lib/models/poll";
import { Stream } from "@/lib/models/stream";

/** GET active poll for a stream */
export async function GET(req: NextRequest) {
  const streamId = req.nextUrl.searchParams.get("streamId");
  if (!streamId) return NextResponse.json({ error: "streamId required" }, { status: 400 });

  await connectDB();
  const poll = await Poll.findOne({ streamId, isActive: true }).lean<any>();
  if (!poll) return NextResponse.json({ poll: null });

  return NextResponse.json({
    poll: {
      id: poll._id.toString(),
      question: poll.question,
      options: poll.options,
      endsAt: poll.endsAt,
      totalVotes: (poll.options as any[]).reduce((sum: number, o: any) => sum + (o.votes ?? 0), 0),
    },
  });
}

/** POST — streamer creates a poll */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { streamId, question, options, durationSeconds } = await req.json();

  if (!streamId || !question || !Array.isArray(options) || options.length < 2 || options.length > 6) {
    return NextResponse.json({ error: "streamId, question, and 2-6 options are required." }, { status: 400 });
  }

  await connectDB();

  // Verify ownership
  const stream = await Stream.findById(streamId).lean<any>();
  if (!stream || stream.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // End any active poll first
  await Poll.updateMany({ streamId, isActive: true }, { $set: { isActive: false } });

  const endsAt = durationSeconds ? new Date(Date.now() + durationSeconds * 1000) : undefined;

  const poll = await Poll.create({
    streamId,
    question: String(question).slice(0, 200),
    options: options.map((o: unknown) => ({ text: String(o).slice(0, 100), votes: 0 })),
    isActive: true,
    endsAt,
  });

  return NextResponse.json({
    poll: {
      id: poll.id,
      question: poll.question,
      options: poll.options,
      endsAt: poll.endsAt,
      totalVotes: 0,
    },
  });
}

/** DELETE — end a poll */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const streamId = req.nextUrl.searchParams.get("streamId");
  if (!streamId) return NextResponse.json({ error: "streamId required" }, { status: 400 });

  await connectDB();
  const stream = await Stream.findById(streamId).lean<any>();
  if (!stream || stream.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Poll.updateMany({ streamId, isActive: true }, { $set: { isActive: false } });
  return NextResponse.json({ ok: true });
}
