import mongoose, { Schema, InferSchemaType } from "mongoose";

const UserPreferencesSchema = new Schema(
  {
    fontSize: { type: String, default: "14" },
    tabSize: { type: String, default: "2" },
    autoSave: { type: Boolean, default: true },
    formatOnSave: { type: Boolean, default: false },
    minimap: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
    avatarDataUrl: { type: String, default: "" },
    profileVisibility: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PUBLIC" },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User =
  mongoose.models.User || mongoose.model("User", UserSchema);