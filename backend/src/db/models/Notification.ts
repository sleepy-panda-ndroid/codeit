import mongoose, { InferSchemaType, Schema } from "mongoose";

export const NOTIFICATION_TYPES = ["PROJECT_INVITE"] as const;
export const NOTIFICATION_STATUSES = ["PENDING", "ACCEPTED", "DECLINED"] as const;

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "PENDING",
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    accessId: {
      type: Schema.Types.ObjectId,
      ref: "ProjectAccess",
      required: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ accessId: 1 }, { unique: true });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

export const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);