import { ProjectAccess } from "../db/models/ProjectAccess";
import { NodeModel } from "../db/models/Node";

export const PROJECT_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024;

export async function getOwnedProjectStorage(userId: string) {
  const owned = await ProjectAccess.find({ userId, role: "OWNER", status: "ACCEPTED" }).select("projectId").lean();
  const projectIds = owned.map((row) => row.projectId);
  const result = await NodeModel.aggregate([
    { $match: { projectId: { $in: projectIds }, type: "file" } },
    { $project: { bytes: { $strLenBytes: { $ifNull: ["$content", ""] } } } },
    { $group: { _id: null, bytes: { $sum: "$bytes" } } },
  ]);
  return Number(result[0]?.bytes ?? 0);
}

export async function assertProjectStorageAvailable(userId: string, additionalBytes: number) {
  const usedBytes = await getOwnedProjectStorage(userId);
  if (usedBytes + additionalBytes > PROJECT_STORAGE_LIMIT_BYTES) {
    const error = new Error("Your owned projects exceed the 100 MB storage limit");
    (error as Error & { code?: string }).code = "PROJECT_STORAGE_LIMIT";
    throw error;
  }
}
