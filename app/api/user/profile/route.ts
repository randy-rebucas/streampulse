import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.user.id)
      .select("name bio slowModeSeconds pinnedMessage")
      .lean<any>();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({
      user: {
        name: user.name ?? "",
        bio: user.bio ?? "",
        slowModeSeconds: user.slowModeSeconds ?? 0,
        pinnedMessage: user.pinnedMessage ?? "",
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const trimmed = String(body.name).trim();
      if (trimmed.length < 2) return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
      if (trimmed.length > 64) return NextResponse.json({ error: "Name must be under 64 characters." }, { status: 400 });
      update.name = trimmed;
    }

    if (body.bio !== undefined) {
      update.bio = String(body.bio).slice(0, 300);
    }

    if (typeof body.slowModeSeconds === "number") {
      update.slowModeSeconds = Math.max(0, Math.min(600, Math.floor(body.slowModeSeconds)));
    }

    if (body.pinnedMessage !== undefined) {
      update.pinnedMessage = String(body.pinnedMessage).slice(0, 300);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(session.user.id, update);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}

