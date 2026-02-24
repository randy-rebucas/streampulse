import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { generateStreamKey } from "@/lib/utils";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const newKey = generateStreamKey();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { streamKey: newKey },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ streamKey: newKey });
  } catch (error) {
    console.error("Stream key regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate stream key" },
      { status: 500 }
    );
  }
}
