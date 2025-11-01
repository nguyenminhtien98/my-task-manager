import { Task, BasicProfile } from "../types/Types";

export const enrichTaskAssignee = (
  task: Task,
  memberMap: Map<string, BasicProfile>
): Task => {
  if (task.assignee && typeof task.assignee === "string") {
    const profile = memberMap.get(task.assignee);
    if (profile) {
      return {
        ...task,
        assignee: profile,
      };
    }
  }
  return task;
};

export const preserveAssignee = (
  incoming: Task,
  memberMap: Map<string, BasicProfile>,
  fallback?: string | BasicProfile
): Task => {
  if (incoming.assignee && typeof incoming.assignee === "object") {
    const currentProfile = incoming.assignee as BasicProfile;
    const hasName =
      typeof currentProfile.name === "string" &&
      currentProfile.name.trim().length > 0;

    if (hasName) {
      return incoming;
    }

    const enrichedProfile =
      currentProfile.$id && memberMap.get(currentProfile.$id);
    if (enrichedProfile) {
      return {
        ...incoming,
        assignee: enrichedProfile,
      };
    }
  }

  if (
    typeof incoming.assignee === "string" &&
    incoming.assignee.trim() !== "" &&
    memberMap.has(incoming.assignee)
  ) {
    return {
      ...incoming,
      assignee: memberMap.get(incoming.assignee),
    } as Task;
  }

  if (incoming.assignee == null) {
    const fallbackProfile =
      typeof fallback === "object"
        ? fallback
        : typeof fallback === "string"
        ? memberMap.get(fallback)
        : undefined;

    if (fallbackProfile) {
      return { ...incoming, assignee: fallbackProfile };
    }
    if (typeof fallback === "string") {
      return { ...incoming, assignee: fallback };
    }
  }

  return incoming;
};

export const enrichTasksAssignee = (
  tasks: Task[],
  memberMap: Map<string, BasicProfile>
): Task[] => {
  return tasks.map((task) => enrichTaskAssignee(task, memberMap));
};
