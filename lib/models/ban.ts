import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IBan extends Document {
  streamerId: Types.ObjectId;
  bannedUserId: Types.ObjectId;
  bannedUsername: string;
  reason?: string;
  /** null = permanent, Date = timeout until */
  expiresAt?: Date | null;
  createdAt: Date;
}

const BanSchema = new Schema<IBan>(
  {
    streamerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    bannedUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bannedUsername: { type: String, required: true },
    reason: { type: String },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BanSchema.index({ streamerId: 1, bannedUserId: 1 }, { unique: true });

export const Ban: Model<IBan> =
  mongoose.models.Ban ?? mongoose.model<IBan>("Ban", BanSchema);
