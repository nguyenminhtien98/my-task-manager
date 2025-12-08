import { Task, BasicProfile } from "../types/Types";

export const enrichTaskAssignee = (
  task: Task,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  memberMap: Map<string, BasicProfile>
): Task => {
  return task;
};

export const preserveAssignee = (incoming: Task): Task => {
  return incoming;
};

export const enrichTasksAssignee = (
  tasks: Task[],
  memberMap: Map<string, BasicProfile>
): Task[] => {
  return tasks.map((task) => enrichTaskAssignee(task, memberMap));
};
