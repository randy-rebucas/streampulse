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
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);
