import mongoose, { Schema, InferSchemaType } from "mongoose";

export const NODE_TYPES = ["file", "folder"] as const;

const NodeSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Node", default: null }, // null = project root
    type: { type: String, enum: NODE_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    content: { type: String, default: "" }, // files only; "" for folders
  },
  { timestamps: true }
);

// no two siblings with the same name in the same folder
NodeSchema.index({ projectId: 1, parentId: 1, name: 1 }, { unique: true });

export type NodeDoc = InferSchemaType<typeof NodeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const NodeModel =
  mongoose.models.Node || mongoose.model("Node", NodeSchema);