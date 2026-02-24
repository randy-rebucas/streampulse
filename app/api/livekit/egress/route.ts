import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { startYouTubeEgress, stopEgress } from "@/lib/livekit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomName, youtubeStreamKey } = await req.json();

    if (!roomName || !youtubeStreamKey) {
      return NextResponse.json(
        { error: "roomName and youtubeStreamKey are required" },
        { status: 400 }
      );
    }

    const egressId = await startYouTubeEgress(roomName, youtubeStreamKey);
    return NextResponse.json({ egressId });
  } catch (error) {
    console.error("Egress start error:", error);
    return NextResponse.json({ error: "Failed to start YouTube egress" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { egressId } = await req.json();
    if (!egressId) {
      return NextResponse.json({ error: "egressId is required" }, { status: 400 });
    }

    await stopEgress(egressId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Egress stop error:", error);
    return NextResponse.json({ error: "Failed to stop egress" }, { status: 500 });
  }
}
