import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";
import { generateStreamKey } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim().slice(0, 64);
    const trimmedEmail = String(email).trim().toLowerCase();

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Password must be under 128 characters." },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate a unique username from the email prefix, appending a counter on collision
    const base = trimmedEmail.split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20) || "user";
    let username = base;
    let attempt = 0;
    while (await User.exists({ username })) {
      attempt++;
      username = `${base}${attempt}`;
    }

    await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      username,
      streamKey: generateStreamKey(),
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 }
    );
  }
}
