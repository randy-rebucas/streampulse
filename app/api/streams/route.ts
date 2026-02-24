import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateStreamKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const liveOnly = req.nextUrl.searchParams.get("live") === "true";

    const streams = await db.stream.findMany({
      where: {
        ...(liveOnly ? { isLive: true } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { tags: { hasSome: [search] } },
              ],
            }
          : {}),
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
      orderBy: [{ isLive: "desc" }, { viewerCount: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    return NextResponse.json({ streams });
  } catch (error) {
    console.error("Streams list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, tags } = await req.json();

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Find or create user in DB
    let dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!dbUser) {
      dbUser = await db.user.create({
        data: {
          clerkId: user.id,
          username: user.username || user.id,
          displayName: user.firstName || user.username || "User",
          avatarUrl: user.imageUrl,
          isStreamer: true,
          streamKey: generateStreamKey(),
        },
      });
    }

    const stream = await db.stream.create({
      data: {
        title,
        description,
        tags: tags || [],
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ stream });
  } catch (error) {
    console.error("Stream create error:", error);
    return NextResponse.json(
      { error: "Failed to create stream" },
      { status: 500 }
    );
  }
}
