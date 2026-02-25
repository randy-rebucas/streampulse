import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IChatMessage extends Document {
  content: string;
  isBot: boolean;
  isFlagged: boolean;
  userId?: Types.ObjectId;
  streamId: string;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    content: { type: String, required: true },
    isBot: { type: Boolean, default: false },
    isFlagged: { type: Boolean, default: false },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    streamId: { type: String, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ??
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
