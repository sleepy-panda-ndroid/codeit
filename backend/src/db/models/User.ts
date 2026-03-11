import mongoose, { Schema, InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);