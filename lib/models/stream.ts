import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStream extends Document {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isLive: boolean;
  viewerCount: number;
  peakViewers: number;
  startedAt?: Date;
  endedAt?: Date;
  tags: string[];
  userId: Types.ObjectId;
  watchPartyQueue?: string[];
  watchPartyQueueIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StreamSchema = new Schema<IStream>(
  {
    title: { type: String, required: true },
    description: { type: String },
    thumbnailUrl: { type: String },
    isLive: { type: Boolean, default: false, index: true },
    viewerCount: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    startedAt: { type: Date },
    endedAt: { type: Date },
    tags: [{ type: String }],
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    watchPartyQueue: { type: [String], default: [] },
    watchPartyQueueIndex: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Stream: Model<IStream> =
  mongoose.models.Stream ?? mongoose.model<IStream>("Stream", StreamSchema);
