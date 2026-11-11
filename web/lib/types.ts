export type Mark = 2 | 3 | 4 | 5;
export type MarkCounts = Record<"5" | "4" | "3" | "2", number>;

export interface StudentRow {
  name: string;
  marks: (number | null)[];
  raw: (number | null)[];
  avg: number | null;
  counts: MarkCounts;
  total: number;
  category: string;
  subjByMark: Record<string, number>;
}

export interface SubjectRow {
  name: string;
  avg: number | null;
  counts: MarkCounts;
  graded: number;
  assessed: number;
  success: number | null;
  quality: number | null;
  missingStudents: string[];
}

export interface GroupItem {
  name: string;
  detail: string;
}

export interface Group {
  key: string;
  title: string;
  hint: string;
  items: GroupItem[];
  tone: "m5" | "m4" | "m3" | "m2";
}

export interface Kpis {
  students: number;
  marks: number;
  subjects: number;
  avg: number | null;
  success: number | null;
  quality: number | null;
}

export interface Payload {
  class: string;
  date: string;
  periodStart?: string;
  grade?: number;
  kpis: Kpis;
  definitions: { success: string; quality: string; avg: string };
  noMarksStudents: string[];
  emptySubjects: string[];
  groups: Group[];
  strongSubjects: { name: string; avg: number }[];
  weakSubjects: { name: string; avg: number }[];
  marks: { value: string; count: number; share: number | null }[];
  categories: { name: string; hint: string; count: number; share: number | null }[];
  subjects: SubjectRow[];
  ranking: {
    place: number;
    name: string;
    avg: number;
    counts: MarkCounts;
    total: number;
    category: string;
  }[];
  rows: StudentRow[];
  subjectNames: string[];
  studentNames: string[];
}

export type Role = "admin" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number;
  letter: string;
  teacherIds: string[];
  createdAt: string;
  deletedAt?: string;
}

export type InviteStatus = "pending" | "accepted" | "revoked";

export interface Invite {
  id: string;
  email: string;
  classIds: string[];
  token: string;
  createdAt: string;
  expiresAt: string;
  status: InviteStatus;
  invitedBy: string;
}

export interface Snapshot {
  id: string;
  classId: string;
  fileName: string;
  dataDate: string;
  periodStart: string;
  uploadedAt: string;
  uploadedBy: string;
  payload: Payload;
  deletedAt?: string;
}

export interface AppState {
  sessionUserId: string | null;
  users: User[];
  classes: ClassRoom[];
  invites: Invite[];
  snapshots: Snapshot[];
}