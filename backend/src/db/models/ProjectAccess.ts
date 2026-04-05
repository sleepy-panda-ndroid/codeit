import mongoose, { Schema, InferSchemaType } from "mongoose";

export const PROJECT_ACCESS_ROLES = ["OWNER", "WRITER", "READER"] as const;
export const PROJECT_ACCESS_STATUSES = ["PENDING", "ACCEPTED"] as const;

const ProjectAccessSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: PROJECT_ACCESS_ROLES,
      required: true,
    },
    status: {
      type: String,
      enum: PROJECT_ACCESS_STATUSES,
      required: true,
      default: "ACCEPTED",
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

ProjectAccessSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export type ProjectAccessDoc = InferSchemaType<typeof ProjectAccessSchema>;

export const ProjectAccess =
  mongoose.models.ProjectAccess ||
  mongoose.model("ProjectAccess", ProjectAccessSchema);