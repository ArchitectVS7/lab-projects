// --- User ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

// --- Project ---

export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  ownerId: string;
  createdAt: string;
  owner: User;
  members: ProjectMember[];
  tasks?: Task[];
  _count?: { tasks: number };
}

// --- Task ---

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  recurringTaskId: string | null;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  project: Pick<Project, 'id' | 'name' | 'color'>;
  assignee: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
  creator: Pick<User, 'id' | 'name'>;
  tags?: TaskTag[];
}

// --- Recurring Task ---

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface RecurringTask {
  id: string;
  baseTaskId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek: string | null;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  lastGenerated: string | null;
  createdAt: string;
  projectId: string;
  creatorId: string;
  project: Pick<Project, 'id' | 'name' | 'color'>;
  creator: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}

// --- Tag ---

export interface Tag {
  id: string;
  name: string;
  color: string;
  projectId: string;
  createdAt: string;
}

export interface TaskTag {
  taskId: string;
  tagId: string;
  tag: Tag;
}

// --- Custom Field ---

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string | null; // JSON array for DROPDOWN
  required: boolean;
  projectId: string;
  createdAt: string;
}

export interface CustomFieldValue {
  id: string;
  value: string;
  taskId: string;
  fieldId: string;
  field: CustomFieldDefinition;
}

// --- Attachment ---

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  taskId: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy: Pick<User, 'id' | 'name' | 'avatarUrl'>;
}
