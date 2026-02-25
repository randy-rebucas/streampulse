import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPollOption {
  text: string;
  votes: number;
}

export interface IPoll extends Document {
  streamId: string;
  question: string;
  options: IPollOption[];
  isActive: boolean;
  endsAt?: Date;
  createdAt: Date;
}

const PollSchema = new Schema<IPoll>(
  {
    streamId: { type: String, required: true, index: true },
    question: { type: String, required: true, maxlength: 200 },
    options: [
      {
        text: { type: String, required: true, maxlength: 100 },
        votes: { type: Number, default: 0 },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    endsAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Poll: Model<IPoll> =
  mongoose.models.Poll ?? mongoose.model<IPoll>("Poll", PollSchema);
