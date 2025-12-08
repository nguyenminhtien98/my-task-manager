import { Task } from "../types/Types";

export type RawTaskDocument = Record<string, unknown> & {
  _id?: string;
  assignee?: unknown;
  completedBy?: unknown;
  attachedFile?: unknown;
  projectId?: string;
};

export const resolveProfileId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const maybe = value as { _id?: string; user_id?: string };
    if (maybe._id && typeof maybe._id === "string") {
      return maybe._id;
    }
    if (maybe.user_id && typeof maybe.user_id === "string") {
      return maybe.user_id;
    }
  }
  return undefined;
};

export const mapTaskDocument = (raw: RawTaskDocument): Task => {
  return raw as unknown as Task;
};
