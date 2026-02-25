import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { ScheduledStream } from "@/lib/models/scheduledStream";

/** GET upcoming scheduled streams for the current user */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const schedules = await ScheduledStream.find({
    userId: session.user.id,
    scheduledAt: { $gte: new Date() },
  })
    .sort({ scheduledAt: 1 })
    .lean<any[]>();

  return NextResponse.json({
    schedules: schedules.map((s) => ({ ...s, id: s._id.toString() })),
  });
}

/** POST — create a scheduled stream */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, tags, scheduledAt } = await req.json();

  if (!title || !scheduledAt) {
    return NextResponse.json({ error: "title and scheduledAt are required." }, { status: 400 });
  }

  const date = new Date(scheduledAt);
  if (isNaN(date.getTime()) || date < new Date()) {
    return NextResponse.json({ error: "scheduledAt must be a future date." }, { status: 400 });
  }

  await connectDB();
  const schedule = await ScheduledStream.create({
    userId: session.user.id,
    title: String(title).slice(0, 100),
    description: description ? String(description).slice(0, 500) : undefined,
    tags: Array.isArray(tags) ? tags.slice(0, 3) : [],
    scheduledAt: date,
  });

  return NextResponse.json({ schedule: { ...schedule.toObject(), id: schedule.id } }, { status: 201 });
}

/** DELETE — remove a scheduled stream */
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  await connectDB();
  const deleted = await ScheduledStream.findOneAndDelete({ _id: id, userId: session.user.id });
  if (!deleted) return NextResponse.json({ error: "Schedule not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
