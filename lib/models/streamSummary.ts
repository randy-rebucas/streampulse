import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IStreamSummary extends Document {
  title: string;
  tldr: string;
  keyTopics: string[];
  highlights: object;
  sentiment: string;
  streamId: Types.ObjectId;
  createdAt: Date;
}

const StreamSummarySchema = new Schema<IStreamSummary>(
  {
    title: { type: String, required: true },
    tldr: { type: String, required: true },
    keyTopics: [{ type: String }],
    highlights: { type: Schema.Types.Mixed },
    sentiment: { type: String, required: true },
    streamId: { type: Schema.Types.ObjectId, ref: "Stream", required: true, unique: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const StreamSummary: Model<IStreamSummary> =
  mongoose.models.StreamSummary ??
  mongoose.model<IStreamSummary>("StreamSummary", StreamSummarySchema);
