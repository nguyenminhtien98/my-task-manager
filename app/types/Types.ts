import type { ReactNode } from "react";
import { DragEndEvent } from "@dnd-kit/core";

export type TaskStatus = "list" | "doing" | "done" | "completed" | "bug";
export type IssueType = "Bug" | "Improvement" | "Feature";
export type Priority = "High" | "Medium" | "Low";

export interface BasicProfile {
  $id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  [key: string]: unknown;
}

export interface Task {
  seq: number;
  id: string;
  title: string;
  description: string;
  assignee?: string | BasicProfile;
  status: TaskStatus;
  order: number;
  startDate?: string | null;
  endDate?: string | null;
  predictedHours?: number;
  completedBy?: string;
  issueType: IssueType;
  priority: Priority;
  projectId?: string;
  projectName?: string;
  attachedFile?: (TaskAttachment | string)[];
}

export interface ModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  title: string;
  children: React.ReactNode;
  panelClassName?: string;
  onClose?: () => void;
  showBackButton?: boolean;
  onBack?: () => void;
  backButtonContent?: ReactNode;
}

export interface TaskCardProps {
  task: Task;
  index?: number;
  onClick?: () => void;
  customClass?: string;
  isDraggable?: boolean;
}

// Định nghĩa props chung cho TaskModal
export interface TaskModalProps {
  mode: "create" | "detail";
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  // create mode:
  onCreate?: (task: Task) => void;
  nextSeq?: number;
  // detail mode:
  task?: Task | null;
  onUpdate?: (task: Task) => void;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onCreate: (data: Task) => void; // now chỉ trả về form data
  nextSeq: number;
}

export interface CreateTaskFormValues {
  title: string;
  description: string;
  assignee: string | BasicProfile;
  startDate: string;
  endDate: string;
  predictedHours: number;
  issueType: IssueType;
  priority: Priority;
  attachments: TaskAttachment[];
}

export interface TaskDetailModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  task: Task | null;
  onUpdate: (task: Task) => void;
  isLeader: boolean;
  currentUser: string;
}

export interface TaskDetailFormValues {
  title: string;
  description: string;
  assignee: string | BasicProfile;
  startDate: string;
  endDate: string;
  predictedHours: number;
  attachments?: TaskAttachment[];
}

export interface User {
  id: string;
  name: string;
  role: "leader" | "user";
}

export interface AuthContextType {
  user: User | null;
  login: (id: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthHydrated?: boolean;
}

export interface LoginRegisterModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onLoginSuccess: (user: { name: string }) => void;
}

export interface FormUserValues {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  currentUserName: string;
  isLeader: boolean;
  onTaskClick: (task: Task) => void;
}

export interface HeaderProps {
  onCreateTask: () => void;
  onLoginClick: () => void;
  onCreateProject?: () => void;
}

export interface Profile {
  $id: string;
  user_id: string;
  name: string;
  email: string;
  role: "user" | "leader";
  avatarUrl?: string | null;
}

export interface Project {
  $id: string;
  name: string;
  leader: Profile;
  $createdAt?: string;
  themeColor?: string;
}

export interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  currentProjectRole: "leader" | "user" | null;
  setCurrentProjectRole: (role: "leader" | "user" | null) => void;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isProjectsHydrated?: boolean;
  isTasksHydrated?: boolean;
  setTasksHydrated?: (ready: boolean) => void;
}

export interface AssigneeDropdownProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

export interface BoardProps {
  tasks: Task[];
  currentUser: string;
  isLeader: boolean;
  onMove: (e: DragEndEvent) => void;
  onTaskClick: (t: Task) => void;
}

export interface LeaderAssigneeOptionsProps {
  leaderName: string;
  onMemberAdded: (memberName: string) => void;
  existingUsers: string[];
}

export interface ProjectFormValues {
  name: string;
  leader: string;
}

export interface TaskAttachment {
  url: string;
  name: string;
  type: "image" | "video" | "file";
  createdAt: string;
}
