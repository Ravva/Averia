import type { AppState, ClassRoom, Invite, Payload, Snapshot, User } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init?.headers
        : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? "Не удалось выполнить запрос.";
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export interface StateResponse {
  user: User;
  classes: ClassRoom[];
  users: User[];
  invites: Invite[];
  snapshots: Snapshot[];
}

export const api = {
  state: () => request<StateResponse>("/api/state"),

  login: (email: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  createClass: (data: {
    name: string;
    grade: number;
    letter: string;
    teacherIds: string[];
  }) =>
    request<{ class: ClassRoom }>("/api/classes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateClass: (id: string, patch: Partial<Omit<ClassRoom, "deletedAt">> & { deletedAt?: string | null }) =>
    request<{ ok: true }>("/api/classes", {
      method: "PATCH",
      body: JSON.stringify({ id, ...patch }),
    }),

  createInvite: (email: string, classIds: string[]) =>
    request<{ invite: Invite }>("/api/invites", {
      method: "POST",
      body: JSON.stringify({ email, classIds }),
    }),

  revokeInvite: (id: string) =>
    request<{ ok: true }>("/api/invites", {
      method: "PATCH",
      body: JSON.stringify({ id, status: "revoked" }),
    }),

  inviteInfo: (token: string) =>
    request<{
      email: string;
      expiresAt: string;
      status: Invite["status"];
      expired: boolean;
      classNames: string[];
    }>(`/api/invites/${token}`),

  acceptInvite: (token: string, name: string, password: string) =>
    request<{ user: User }>(`/api/invites/${token}`, {
      method: "POST",
      body: JSON.stringify({ name, password }),
    }),

  previewSnapshot: (classId: string, file: File) => {
    const form = new FormData();
    form.append("classId", classId);
    form.append("file", file);
    return request<{
      payload: Payload;
      fileName: string;
      dataDate: string;
      warnings: { duplicateDate: boolean; classMismatch: string | null };
    }>("/api/snapshots?preview=1", { method: "POST", body: form });
  },

  uploadSnapshot: (classId: string, file: File) => {
    const form = new FormData();
    form.append("classId", classId);
    form.append("file", file);
    return request<{
      snapshot: { classId: string; fileName: string; dataDate: string };
      warnings: { duplicateDate: boolean; classMismatch: string | null };
    }>("/api/snapshots", { method: "POST", body: form });
  },

  setSnapshotDeleted: (id: string, deletedAt: string | null) =>
    request<{ ok: true }>("/api/snapshots", {
      method: "PATCH",
      body: JSON.stringify({ id, deletedAt }),
    }),
};

export type { AppState };
