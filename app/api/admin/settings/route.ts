import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { SiteSettings, getSiteSettings } from "@/lib/models/siteSettings";

function isAdmin(email?: string | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!adminEmail && !!email && email.trim().toLowerCase() === adminEmail;
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const settings = await getSiteSettings();
  return NextResponse.json({
    registrationEnabled: settings.registrationEnabled,
    bannedWords: settings.bannedWords ?? [],
    moderationThreshold: settings.moderationThreshold ?? 0.5,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (typeof body.registrationEnabled === "boolean") {
    update.registrationEnabled = body.registrationEnabled;
  }

  if (Array.isArray(body.bannedWords)) {
    update.bannedWords = body.bannedWords
      .filter((w: unknown) => typeof w === "string" && w.trim())
      .map((w: string) => w.trim().toLowerCase())
      .slice(0, 500);
  }

  if (typeof body.moderationThreshold === "number") {
    const t = body.moderationThreshold;
    if (t < 0 || t > 1) {
      return NextResponse.json({ error: "moderationThreshold must be between 0 and 1." }, { status: 400 });
    }
    update.moderationThreshold = t;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  await connectDB();
  await SiteSettings.findOneAndUpdate({ key: "global" }, { $set: update }, { upsert: true });

  return NextResponse.json({ ok: true, ...update });
}
