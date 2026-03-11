import mongoose, { Schema, InferSchemaType } from "mongoose";

const FileSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    path: { type: String, required: true }, // e.g. "src/main.cpp"
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

FileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export type FileDoc = InferSchemaType<typeof FileSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FileModel =
  mongoose.models.File || mongoose.model("File", FileSchema);