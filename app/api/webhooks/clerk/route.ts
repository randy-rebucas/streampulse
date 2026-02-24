import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { generateStreamKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: any;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const eventType = event.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, username, first_name, image_url } = event.data;

    await db.user.upsert({
      where: { clerkId: id },
      create: {
        clerkId: id,
        username: username || id,
        displayName: first_name || username || "User",
        avatarUrl: image_url,
        streamKey: generateStreamKey(),
      },
      update: {
        username: username || undefined,
        displayName: first_name || undefined,
        avatarUrl: image_url || undefined,
      },
    });
  }

  if (eventType === "user.deleted") {
    const { id } = event.data;
    await db.user.deleteMany({ where: { clerkId: id } });
  }

  return NextResponse.json({ received: true });
}
