import type { ReactNode } from "react";
import { DragEndEvent } from "@dnd-kit/core";

export type TaskStatus = "list" | "doing" | "done" | "completed" | "bug";
export type IssueType = "Bug" | "Improvement" | "Feature";
export type Priority = "High" | "Medium" | "Low";

export type NotificationType =
  | "system.welcome"
  | "profile.avatar.updated"
  | "profile.name.updated"
  | "profile.info.updated"
  | "project.created"
  | "project.member.added"
  | "project.member.removed"
  | "project.deleted"
  | "project.closed"
  | "project.reopened"
  | "project.themeColor.updated"
  | "task.created"
  | "task.updated"
  | "task.assigned"
  | "task.completed"
  | "task.movedToBug"
  | "task.movedToCompleted"
  | "task.comment.added"
  | "task.deleted"
  | "project.chat.message"
  | "feedback.message.fromUser"
  | "feedback.message.fromAdmin"
  | "system.moderation.rateLimit"
  | "system.moderation.suspended";

export type NotificationScope = "system" | "profile" | "project" | "task";

export type NotificationStatus = "unread" | "read" | "archived";

export interface NotificationMessageSegment {
  type: "text" | "action";
  content: string;
  actionKey?: string;
}

export interface NotificationMessage {
  segments: NotificationMessageSegment[];
  plainText: string;
}

export interface NotificationMetadata {
  audience?: "actor" | "target" | "member" | "leader" | "assignee" | "creator";
  actorName?: string;
  recipientName?: string;
  projectName?: string;
  projectId?: string;
  taskTitle?: string;
  taskId?: string;
  field?: string;
  fieldLabel?: string;
  newValue?: string;
  oldValue?: string;
  targetMemberName?: string;
  leaderName?: string;
  memberName?: string;
  commentPreview?: string;
  statusLabel?: string;
  event?: string;
  [key: string]: unknown;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  scope: NotificationScope;
  status: NotificationStatus;
  title?: string | null;
  message: NotificationMessage;
  metadata?: NotificationMetadata;
  createdAt: string;
  updatedAt?: string;
  seenAt?: string | null;
  readAt?: string | null;
  actor?: BasicProfile | null;
  recipient?: BasicProfile | null;
  project?: {
    $id: string;
    name?: string | null;
  } | null;
  task?: {
    $id: string;
    title?: string | null;
  } | null;
}

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

export interface TaskModalProps {
  mode: "create" | "detail";
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onCreate?: (task: Task) => void;
  nextSeq?: number;
  task?: Task | null;
  onUpdate?: (task: Task) => void;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onCreate: (data: Task) => void;
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
  currentUserId?: string | null;
  isLeader: boolean;
  isProjectClosed: boolean;
  onTaskClick: (task: Task) => void;
}

export interface HeaderProps {
  onCreateTask: () => void;
  onLoginClick: () => void;
  onCreateProject?: () => void;
  isProjectClosed: boolean;
  projectTheme?: string | null;
  isTaskModalOpen?: boolean;
  isProjectModalOpen?: boolean;
}

export type FooterAction = "add" | "members" | "chat";

export interface Profile {
  $id: string;
  user_id: string;
  name: string;
  email: string;
  role: "user" | "leader";
  avatarUrl?: string | null;
}

export type ProjectStatus = "active" | "closed";

export interface Project {
  $id: string;
  name: string;
  leader: Profile;
  $createdAt?: string;
  themeColor?: string;
  status?: ProjectStatus;
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
  isProjectClosed: boolean;
}

export interface AssigneeDropdownProps {
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

export interface BoardProps {
  tasks: Task[];
  currentUser: string;
  currentUserId?: string | null;
  isLeader: boolean;
  onMove: (e: DragEndEvent, fallbackStatus?: TaskStatus | null) => void;
  onTaskClick: (t: Task) => void;
  isProjectClosed: boolean;
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
