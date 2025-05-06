export type TaskStatus = "list" | "doing" | "done" | "completed" | "bug";
export type IssueType = "Bug" | "Improvement" | "Feature";
export type Priority = "High" | "Medium" | "Low";

export interface Task {
  seq: number;
  id: string;
  title: string;
  description: string;
  assignee?: string;
  status: TaskStatus;
  order: number;
  startDate?: string; // dạng "yyyy-mm-dd"
  endDate?: string; // dạng "yyyy-mm-dd"
  predictedHours?: number;
  completedBy?: string; //tên leader đã kéo task sang cột "completed"
  issueType: IssueType;
  priority: Priority;
}

export interface ModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export interface TaskCardProps {
  task: Task;
  index?: number;
  onClick?: () => void;
  customClass?: string;
  isDraggable?: boolean;
}

export interface CreateTaskModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onCreate: (task: Task) => void;
}

export interface CreateTaskFormValues {
  title: string;
  description: string;
  assignee: string;
  startDate: string;
  endDate: string;
  predictedHours: number;
  issueType: IssueType;
  priority: Priority;
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
  assignee: string;
  startDate: string;
  endDate: string;
  predictedHours: number;
}

export interface User {
  id: string;
  name: string;
  role: "leader" | "user";
}

export interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
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
