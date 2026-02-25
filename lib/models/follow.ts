import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IFollow extends Document {
  followerId: Types.ObjectId;
  streamerId: Types.ObjectId;
  createdAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    followerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    streamerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Composite unique index – one follow per pair
FollowSchema.index({ followerId: 1, streamerId: 1 }, { unique: true });

export const Follow: Model<IFollow> =
  mongoose.models.Follow ?? mongoose.model<IFollow>("Follow", FollowSchema);
