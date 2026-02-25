import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISiteSettings extends Document {
  key: string;
  registrationEnabled: boolean;
  /** Words/phrases that are auto-blocked in chat (case-insensitive) */
  bannedWords: string[];
  /** 0–1 threshold for OpenAI moderation flags (lower = stricter). Default 0.5 */
  moderationThreshold: number;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    registrationEnabled: { type: Boolean, default: true },
    bannedWords: { type: [String], default: [] },
    moderationThreshold: { type: Number, default: 0.5 },
  },
  { timestamps: true }
);

export const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>("SiteSettings", SiteSettingsSchema);

/** Returns (and creates if absent) the singleton settings document. */
export async function getSiteSettings(): Promise<ISiteSettings> {
  const settings = await SiteSettings.findOneAndUpdate(
    { key: "global" },
    {
      $setOnInsert: {
        key: "global",
        registrationEnabled: true,
        bannedWords: [],
        moderationThreshold: 0.5,
      },
    },
    { upsert: true, new: true }
  );
  return settings!;
}
