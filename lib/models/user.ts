import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name?: string;
  email?: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  username?: string;
  bio?: string;
  isStreamer: boolean;
  streamKey?: string;
  watchPartyQueue?: string[];
  /** Slow-mode: minimum seconds between messages from non-streamer viewers. 0 = off */
  slowModeSeconds: number;
  /** Pinned message shown at top of chat */
  pinnedMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String },
    username: { type: String, unique: true, sparse: true },
    bio: { type: String },
    isStreamer: { type: Boolean, default: false },
    streamKey: { type: String, unique: true, sparse: true },
    watchPartyQueue: { type: [String], default: [] },
    slowModeSeconds: { type: Number, default: 0 },
    pinnedMessage: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
