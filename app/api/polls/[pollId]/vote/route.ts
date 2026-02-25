import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { Poll } from "@/lib/models/poll";

/** POST — cast a vote on a poll option */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pollId } = await params;
  const { optionIndex } = await req.json();

  if (typeof optionIndex !== "number") {
    return NextResponse.json({ error: "optionIndex (number) is required." }, { status: 400 });
  }

  await connectDB();
  const poll = await Poll.findById(pollId);
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  if (!poll.isActive) return NextResponse.json({ error: "Poll has ended" }, { status: 409 });
  if (poll.endsAt && poll.endsAt < new Date()) {
    poll.isActive = false;
    await poll.save();
    return NextResponse.json({ error: "Poll has ended" }, { status: 409 });
  }

  if (optionIndex < 0 || optionIndex >= poll.options.length) {
    return NextResponse.json({ error: "Invalid option index" }, { status: 400 });
  }

  // Prevent double-voting
  const alreadyVoted = poll.voters.some((v) => v.userId === session.user!.id);
  if (alreadyVoted) {
    return NextResponse.json({ error: "You have already voted." }, { status: 409 });
  }

  poll.options[optionIndex].votes += 1;
  poll.voters.push({ userId: session.user.id, optionIndex });
  await poll.save();

  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
  return NextResponse.json({ options: poll.options, totalVotes });
}
