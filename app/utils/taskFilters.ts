import { Task } from "../types/Types";

export type PriorityKey = "low" | "medium" | "high";
export type IssueTypeKey = "feature" | "bug" | "improvement";

export interface TaskFiltersState {
  noAssignee: boolean;
  myTasks: boolean;
  selectedMembers: string[];
  noDueDate: boolean;
  overdue: boolean;
  priorities: Record<PriorityKey, boolean>;
  issueTypes: Record<IssueTypeKey, boolean>;
}

export const createDefaultTaskFilters = (): TaskFiltersState => ({
  noAssignee: false,
  myTasks: false,
  selectedMembers: [],
  noDueDate: false,
  overdue: false,
  priorities: {
    low: false,
    medium: false,
    high: false,
  },
  issueTypes: {
    feature: false,
    bug: false,
    improvement: false,
  },
});

export const countActiveTaskFilters = (filters: TaskFiltersState): number => {
  let count = 0;
  if (filters.noAssignee) count += 1;
  if (filters.myTasks) count += 1;
  count += filters.selectedMembers.length;
  if (filters.noDueDate) count += 1;
  if (filters.overdue) count += 1;
  count += Object.values(filters.priorities).filter(Boolean).length;
  count += Object.values(filters.issueTypes).filter(Boolean).length;
  return count;
};

const getAssigneeId = (
  assignee: Task["assignee"]
): string | null => {
  if (!assignee) return null;
  if (typeof assignee === "string") return assignee.trim() || null;
  if (typeof assignee === "object") {
    const maybe = assignee as Record<string, unknown>;
    if (typeof maybe.$id === "string") return maybe.$id;
    if (typeof maybe.user_id === "string") return maybe.user_id;
  }
  return null;
};

const isUnassigned = (task: Task) => {
  const id = getAssigneeId(task.assignee);
  return !id;
};

const normalizePriority = (priority?: string | null) =>
  (priority ?? "").toLowerCase();

const priorityKeyToValue = (key: PriorityKey): string => {
  switch (key) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
};

const issueTypeKeyToValue = (key: IssueTypeKey): string => {
  switch (key) {
    case "bug":
      return "bug";
    case "improvement":
      return "improvement";
    default:
      return "feature";
  }
};

export const matchesTaskFilters = (
  task: Task,
  filters: TaskFiltersState,
  options?: {
    currentUserId?: string | null;
    now?: Date;
  }
): boolean => {
  const now = options?.now ?? new Date();
  const activeAssignments =
    filters.noAssignee || filters.myTasks || filters.selectedMembers.length > 0;

  if (activeAssignments) {
    const matchesAssignment: boolean[] = [];
    const assigneeId = getAssigneeId(task.assignee);

    if (filters.noAssignee) {
      matchesAssignment.push(isUnassigned(task));
    }

    if (filters.myTasks && options?.currentUserId) {
      matchesAssignment.push(assigneeId === options.currentUserId);
    }

    if (filters.selectedMembers.length > 0) {
      matchesAssignment.push(
        Boolean(assigneeId && filters.selectedMembers.includes(assigneeId))
      );
    }

    if (!matchesAssignment.some(Boolean)) {
      return false;
    }
  }

  const dueFiltersActive = filters.noDueDate || filters.overdue;
  if (dueFiltersActive) {
    const dueMatches: boolean[] = [];
    if (filters.noDueDate) {
      dueMatches.push(!task.endDate);
    }
    if (filters.overdue) {
      const end = task.endDate ? new Date(task.endDate) : null;
      dueMatches.push(Boolean(end && end < now));
    }
    if (!dueMatches.some(Boolean)) return false;
  }

  const activePriorities = (
    Object.keys(filters.priorities) as PriorityKey[]
  ).filter((key) => filters.priorities[key]);
  if (activePriorities.length > 0) {
    const normalizedPriority = normalizePriority(task.priority);
    const hasPriority = activePriorities.some(
      (key) => normalizedPriority === priorityKeyToValue(key)
    );
    if (!hasPriority) return false;
  }

  const activeIssueTypes = (
    Object.keys(filters.issueTypes) as IssueTypeKey[]
  ).filter((key) => filters.issueTypes[key]);
  if (activeIssueTypes.length > 0) {
    const normalizedIssue =
      (task.issueType ?? "").toString().toLowerCase() || "";
    const matchesIssue = activeIssueTypes.some(
      (key) => normalizedIssue === issueTypeKeyToValue(key)
    );
    if (!matchesIssue) return false;
  }

  return true;
};
