import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IScheduledStream extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  tags: string[];
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledStreamSchema = new Schema<IScheduledStream>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    tags: [{ type: String }],
    scheduledAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const ScheduledStream: Model<IScheduledStream> =
  mongoose.models.ScheduledStream ??
  mongoose.model<IScheduledStream>("ScheduledStream", ScheduledStreamSchema);
