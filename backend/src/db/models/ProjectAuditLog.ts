import mongoose, { InferSchemaType, Schema } from "mongoose";

const ProjectAuditLogSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, enum: ["PROJECT_CREATED", "PROJECT_UPDATED", "NODE_CREATED", "NODE_UPDATED", "NODE_DELETED", "NODE_MOVED", "PROJECT_IMPORTED", "MEMBER_ADDED", "MEMBER_UPDATED", "MEMBER_REMOVED"] },
    targetType: { type: String, required: true, enum: ["PROJECT", "FILE", "FOLDER", "MEMBER"] },
    targetId: { type: String, required: true },
    targetName: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ProjectAuditLogSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Audit records are immutable");
});

export type ProjectAuditLogDoc = InferSchemaType<typeof ProjectAuditLogSchema> & { _id: mongoose.Types.ObjectId };
export const ProjectAuditLog = mongoose.models.ProjectAuditLog || mongoose.model("ProjectAuditLog", ProjectAuditLogSchema);
