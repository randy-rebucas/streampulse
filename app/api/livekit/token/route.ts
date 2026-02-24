import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createViewerToken, createStreamerToken } from "@/lib/livekit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomName, isStreamer } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    const identity = session.user.id;
    const name = session.user.name ?? session.user.email ?? "User";

    const token = isStreamer
      ? await createStreamerToken(roomName, identity, name)
      : await createViewerToken(roomName, identity, name);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
