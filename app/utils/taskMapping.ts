import { BasicProfile, Task } from "../types/Types";

export type RawTaskDocument = Record<string, unknown> & {
  $id?: string;
  assignee?: unknown;
  completedBy?: unknown;
  attachedFile?: unknown;
  projectId?: string;
};

export const resolveProfileId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const maybe = value as { $id?: string; user_id?: string };
    if (maybe.$id && typeof maybe.$id === "string") {
      return maybe.$id;
    }
    if (maybe.user_id && typeof maybe.user_id === "string") {
      return maybe.user_id;
    }
  }
  return undefined;
};

export const mapTaskDocument = (raw: RawTaskDocument): Task => {
  const id = typeof raw.$id === "string" ? raw.$id : (raw.id as string);
  const assignee = raw.assignee as string | BasicProfile | undefined;
  const completedBy = resolveProfileId(raw.completedBy);
  const attachedFile = Array.isArray(raw.attachedFile)
    ? (raw.attachedFile as Task["attachedFile"])
    : undefined;

  return {
    ...(raw as unknown as Task),
    id,
    assignee,
    completedBy,
    attachedFile,
  };
};
