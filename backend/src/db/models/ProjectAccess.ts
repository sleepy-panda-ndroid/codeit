import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProjectAccessSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["OWNER", "WRITER", "READER"],
      required: true,
    },
  },
  { timestamps: true }
);

ProjectAccessSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export type ProjectAccessDoc = InferSchemaType<typeof ProjectAccessSchema>;

export const ProjectAccess =
  mongoose.models.ProjectAccess ||
  mongoose.model("ProjectAccess", ProjectAccessSchema);