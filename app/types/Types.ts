import type { ReactNode } from "react";
import { DragEndEvent } from "@dnd-kit/core";

export type TaskStatus = "list" | "doing" | "done" | "completed" | "bug";
export type IssueType = "task" | "bug" | "feature" | "improvement";
export type Priority = "low" | "medium" | "high" | "urgent";

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
  | "system.moderation.suspended"
  | "dailyReport.reminder";

export type NotificationScope = "system" | "profile" | "project" | "task";

export type NotificationStatus = "unread" | "read" | "archived";

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
  remindTime?: string;
  [key: string]: unknown;
}

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  scope: NotificationScope;
  status: NotificationStatus;
  title?: string | null;
  message: string;
  metadata?: NotificationMetadata;
  createdAt: string;
  updatedAt?: string;
  seenAt?: string | null;
  readAt?: string | null;
  actor?: BasicProfile | null;
  recipient?: BasicProfile | null;
  project?: {
    _id: string;
    name?: string | null;
  } | null;
  task?: {
    _id: string;
    title?: string | null;
  } | null;
}

export interface BasicProfile {
  _id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  [key: string]: unknown;
}

export interface EnrichedProjectMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isLeader: boolean;
  [key: string]: unknown;
}

export interface ProjectMemberProfile {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  isLeader: boolean;
  joinedAt?: string;
  [key: string]: unknown;
}

export interface TaskProfile extends BasicProfile {
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskProject {
  _id: string;
  name: string;
  themeColor?: string;
}

export interface TaskFromBE {
  _id: string;
  taskId: string;
  project: string | TaskProject;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  issueType: IssueType;
  assignee?: TaskProfile | null;
  reporter: TaskProfile;
  startDate?: string | null;
  endDate?: string | null;
  predictedHours?: number;
  order: number;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority?: Priority;
  issueType?: IssueType;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  predictedHours?: number;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    createdAt: string;
  }>;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  issueType?: IssueType;
  assignee?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  predictedHours?: number;
  order?: number;
}

export interface TaskFilterParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  noAssignee?: boolean;
  myTasks?: boolean;
  selectedMembers?: string[];
  noDueDate?: boolean;
  overdue?: boolean;
  priorities?: Priority[];
  issueTypes?: IssueType[];
  search?: string;
}

export interface TaskListResponse {
  tasks: TaskFromBE[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Task extends TaskFromBE {
  seq: number;
  completedBy?: TaskProfile | null;
  assigneeDisplayName?: string | null;
  completedByDisplayName?: string | null;
  assigneeRemoved?: boolean;
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
  hiddenHeader?: boolean;
}

export interface TaskCardProps {
  task: Task;
  index?: number;
  onClick?: () => void;
  customClass?: string;
  isDraggable?: boolean;
  highlightClass?: string;
}

export interface TaskModalProps {
  mode: "create" | "detail";
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  onCreate?: (task: Task) => void;
  nextSeq?: number;
  task?: Task | null;
  onUpdate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
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
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
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
  _id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role?: "user" | "admin" | "moderator";
  createdAt?: string;
}

export type ProjectStatus = "active" | "closed";

export interface ProjectLeader {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  projectId: string;
  name: string;
  themeColor?: string;
  status: ProjectStatus;
  leader: ProjectLeader;
  createdAt: string;
  updatedAt: string;
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
  members: ProjectMemberProfile[];
  isMembersLoading: boolean;
  refreshMembers: () => Promise<void>;
  markProjectAsLocallyCreated: (projectId: string) => void;
  hasMoreProjects: boolean;
  isLoadingMoreProjects: boolean;
  loadMoreProjects: () => Promise<void>;
  allProjects: Project[];
  isLoadingAllProjects: boolean;
  loadAllProjects: () => Promise<void>;
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
  columnPagination?: Record<
    TaskStatus,
    { page: number; hasMore: boolean; loading: boolean }
  >;
  onLoadMore?: (status: TaskStatus) => void;
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

export interface CommentAttachment {
  url: string;
  name: string;
  type: "image" | "video" | "file";
  createdAt?: string;
  size?: number;
  mimeType?: string;
}

export interface CommentAuthor {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Comment {
  _id: string;
  commentId: string;
  task: string;
  author: CommentAuthor;
  content: string;
  attachments: CommentAttachment[];
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentPayload {
  content: string;
  attachments?: CommentAttachment[];
}

export interface UpdateCommentPayload {
  content?: string;
  isVisible?: boolean;
  attachments?: CommentAttachment[];
}

export interface CommentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetCommentsResponse {
  comments: Comment[];
  pagination: CommentPagination;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  isVisible: boolean;
  user: {
    id: string;
    name: string;
  };
  attachments: CommentAttachment[];
}

export interface PendingAttachment {
  id: string;
  file: File;
  mediaType: "image" | "video" | "file";
  previewUrl?: string;
}

export interface CommentSectionProps {
  taskId?: string;
  canComment?: boolean;
  isLocked?: boolean;
  taskTitle?: string;
  assigneeId?: string;
  assigneeName?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  profile: Profile;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
}

export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResponse {
  _id: string;
  projectId: string;
  name: string;
  themeColor?: string;
  status: "active" | "closed";
  leader: ProjectLeader;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  memberCount: number;
  members: ProjectMember[];
  totalTasks: number;
  tasksByStatus: {
    list: number;
    doing: number;
    done: number;
    completed: number;
    bug: number;
  };
}

export interface MemberStatistics {
  profile: ProjectMember;
  totalTasks: number;
  tasksByStatus: {
    list: number;
    doing: number;
    done: number;
    completed: number;
    bug: number;
  };
}

export interface NotificationActor {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface BackendNotification {
  _id: string;
  notificationId: string;
  type: string;
  title: string;
  message: string;
  recipient: string;
  actor?: NotificationActor;
  project?: string;
  task?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface GetNotificationsResponse {
  notifications: NotificationRecord[];
  total: number;
  page: number;
  pages: number;
}

export interface DailyReportAuthor {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface DailyReport {
  _id: string;
  reportId: string;
  room: string;
  project: string;
  author: DailyReportAuthor;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportRoom {
  _id: string;
  roomId: string;
  project: string;
  isEnabled: boolean;
  remindTimeMinutes: number;
  remindWeekdays: number[];
  timezone: string;
  lastRemindedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetReportsParams {
  projectId: string;
  page?: number;
  limit?: number;
  author?: string;
  date?: string;
}

export interface GetReportsResponse {
  success: boolean;
  data: DailyReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ConversationType = "feedback" | "member" | "direct" | "group";

export interface ConversationDocument {
  _id: string;
  type: ConversationType;
  participants: string[];
  projectId?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListEntry extends ConversationDocument {
  __placeholderTargetId?: string;
  __placeholderProjectId?: string | null;
}

export interface ConversationMessageDocument {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  senderId: string;
  content: string;
  attachments: Array<{
    url: string;
    name: string;
    type: "image" | "video" | "file";
    size?: number;
    mimeType?: string;
  }>;
  seenBy: string[];
  createdAt: string;
  replyTo?: {
    messageId: string;
    content: string;
    displayName: string;
    isOwn: boolean;
    attachments?: Array<{
      url: string;
      name: string;
      type: "image" | "video" | "file";
      size?: number;
      mimeType?: string;
    }>;
  };
  reactions?: Array<{
    type: "like" | "heart" | "haha" | "laugh" | "love" | "wow" | "angry";
    userId: string;
    createdAt: string;
  }>;
}

export interface PresenceDocument {
  _id: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  lastFeedbackActionAt?: string | null;
  feedbackStrikeCount?: number;
  feedbackCooldownUntil?: string | null;
  feedbackWindowStart?: string | null;
  feedbackWindowCount?: number;
  feedbackLastViolationAt?: string | null;
}

export interface ProfileDocument {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  createdAt?: string;
}
