import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC", "UNLISTED"],
      default: "PRIVATE",
    },
  },
  { timestamps: true }
);

export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Project =
  mongoose.models.Project || mongoose.model("Project", ProjectSchema);