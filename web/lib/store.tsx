"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import payloads from "./seed/payloads.json";
import type {
  AppState,
  ClassRoom,
  Invite,
  Payload,
  Snapshot,
  User,
} from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "averia-state-v1";

function seedState(): AppState {
  const users: User[] = [
    {
      id: "u-admin",
      name: "Администратор школы",
      email: "admin@averia.school",
      password: "admin123",
      role: "admin",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "u-morozova",
      name: "Учитель 1",
      email: "teacher1@school.ru",
      password: "teacher123",
      role: "teacher",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "u-saveliev",
      name: "Учитель 2",
      email: "teacher2@school.ru",
      password: "teacher123",
      role: "teacher",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
  ];
  const classes: ClassRoom[] = [
    {
      id: "c-9yu",
      name: "9А",
      grade: 9,
      letter: "А",
      teacherIds: ["u-admin"],
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "c-7a",
      name: "7Б",
      grade: 7,
      letter: "Б",
      teacherIds: ["u-morozova"],
      createdAt: "2026-09-01T08:00:00.000Z",
    },
    {
      id: "c-10b",
      name: "10В",
      grade: 10,
      letter: "В",
      teacherIds: ["u-saveliev"],
      createdAt: "2026-09-01T08:00:00.000Z",
    },
  ];
  const seed = payloads as unknown as Record<
    string,
    { prev: Payload; curr: Payload }
  >;
  const classByKey: Record<string, string> = {
    "9А": "c-9yu",
    "7Б": "c-7a",
    "10В": "c-10b",
  };
  const uploader: Record<string, string> = {
    "9А": "u-admin",
    "7Б": "u-morozova",
    "10В": "u-saveliev",
  };
  const snapshots: Snapshot[] = [];
  for (const [key, pair] of Object.entries(seed)) {
    const classId = classByKey[key];
    snapshots.push({
      id: `s-${classId}-prev`,
      classId,
      fileName: `averageMarks_${pair.prev.date}.xlsx`,
      dataDate: pair.prev.date,
      periodStart: "01.09.2026",
      uploadedAt: "2026-10-22T09:30:00.000Z",
      uploadedBy: uploader[key],
      payload: pair.prev,
    });
    snapshots.push({
      id: `s-${classId}-curr`,
      classId,
      fileName: `averageMarks_${pair.curr.date}.xlsx`,
      dataDate: pair.curr.date,
      periodStart: "01.09.2026",
      uploadedAt: "2026-11-09T14:00:00.000Z",
      uploadedBy: uploader[key],
      payload: pair.curr,
    });
  }
  const invites: Invite[] = [
    {
      id: "i-invite-1",
      email: "newteacher@school.ru",
      classIds: ["c-10b"],
      token: "invite-10v-2026",
      createdAt: "2026-11-10T10:00:00.000Z",
      expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      status: "pending",
      invitedBy: "u-admin",
    },
  ];
  return { sessionUserId: "u-admin", users, classes, invites, snapshots };
}

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  currentUser: User | null;
  visibleClasses: ClassRoom[];
  login: (email: string, password: string) => boolean;
  logout: () => void;
  createClass: (data: { name: string; grade: number; letter: string; teacherIds: string[] }) => ClassRoom;
  updateClass: (id: string, patch: Partial<ClassRoom>) => void;
  deleteClass: (id: string) => void;
  restoreClass: (id: string) => void;
  createInvite: (email: string, classIds: string[]) => Invite;
  revokeInvite: (id: string) => void;
  acceptInvite: (token: string, name: string, password: string) => { ok: boolean; error?: string };
  addSnapshot: (classId: string, payload: Payload, fileName: string) => Snapshot;
  deleteSnapshot: (id: string) => void;
  restoreSnapshot: (id: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(seedState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as AppState);
    } catch {
      // corrupted storage falls back to seed
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.sessionUserId) ?? null,
    [state.users, state.sessionUserId],
  );

  const visibleClasses = useMemo(() => {
    const alive = state.classes.filter((c) => !c.deletedAt);
    if (!currentUser) return [];
    if (currentUser.role === "admin") return alive;
    return alive.filter((c) => c.teacherIds.includes(currentUser.id));
  }, [state.classes, currentUser]);

  const login = useCallback((email: string, password: string) => {
    let ok = false;
    setState((s) => {
      const user = s.users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
      );
      if (!user) return s;
      ok = true;
      return { ...s, sessionUserId: user.id };
    });
    return ok;
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, sessionUserId: null }));
  }, []);

  const createClass = useCallback(
    (data: { name: string; grade: number; letter: string; teacherIds: string[] }) => {
      const room: ClassRoom = {
        id: uid("c"),
        ...data,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, classes: [...s.classes, room] }));
      return room;
    },
    [],
  );

  const updateClass = useCallback((id: string, patch: Partial<ClassRoom>) => {
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const deleteClass = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) =>
        c.id === id ? { ...c, deletedAt: new Date().toISOString() } : c,
      ),
    }));
  }, []);

  const restoreClass = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      classes: s.classes.map((c) =>
        c.id === id ? { ...c, deletedAt: undefined } : c,
      ),
    }));
  }, []);

  const createInvite = useCallback((email: string, classIds: string[]) => {
    const invite: Invite = {
      id: uid("i"),
      email: email.trim().toLowerCase(),
      classIds,
      token: uid("inv"),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400_000).toISOString(),
      status: "pending",
      invitedBy: "",
    };
    setState((s) => ({
      ...s,
      invites: [...s.invites, { ...invite, invitedBy: s.sessionUserId ?? "" }],
    }));
    return invite;
  }, []);

  const revokeInvite = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      invites: s.invites.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)),
    }));
  }, []);

  const acceptInvite = useCallback(
    (token: string, name: string, password: string) => {
      const invite = state.invites.find((i) => i.token === token);
      if (!invite) return { ok: false, error: "Ссылка не найдена." };
      if (invite.status === "revoked")
        return { ok: false, error: "Ссылка отозвана администратором." };
      if (invite.status === "accepted")
        return { ok: false, error: "Ссылка уже использована." };
      if (new Date(invite.expiresAt).getTime() < Date.now())
        return { ok: false, error: "Срок действия ссылки истёк." };
      if (state.users.some((u) => u.email === invite.email))
        return { ok: false, error: "Этот email уже зарегистрирован." };
      const user: User = {
        id: uid("u"),
        name: name.trim(),
        email: invite.email,
        password,
        role: "teacher",
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        users: [...s.users, user],
        invites: s.invites.map((i) =>
          i.token === token ? { ...i, status: "accepted" } : i,
        ),
        classes: s.classes.map((c) =>
          invite.classIds.includes(c.id) && !c.teacherIds.includes(user.id)
            ? { ...c, teacherIds: [...c.teacherIds, user.id] }
            : c,
        ),
        sessionUserId: user.id,
      }));
      return { ok: true };
    },
    [state.invites, state.users],
  );

  const addSnapshot = useCallback(
    (classId: string, payload: Payload, fileName: string) => {
      const snapshot: Snapshot = {
        id: uid("s"),
        classId,
        fileName,
        dataDate: payload.date,
        periodStart: payload.periodStart ?? "",
        uploadedAt: new Date().toISOString(),
        uploadedBy: "",
        payload,
      };
      setState((s) => ({
        ...s,
        snapshots: [...s.snapshots, { ...snapshot, uploadedBy: s.sessionUserId ?? "" }],
      }));
      return snapshot;
    },
    [],
  );

  const deleteSnapshot = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      snapshots: s.snapshots.map((x) =>
        x.id === id ? { ...x, deletedAt: new Date().toISOString() } : x,
      ),
    }));
  }, []);

  const restoreSnapshot = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      snapshots: s.snapshots.map((x) =>
        x.id === id ? { ...x, deletedAt: undefined } : x,
      ),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState(seedState());
  }, []);

  const value: StoreValue = {
    state,
    hydrated,
    currentUser,
    visibleClasses,
    login,
    logout,
    createClass,
    updateClass,
    deleteClass,
    restoreClass,
    createInvite,
    revokeInvite,
    acceptInvite,
    addSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    resetDemo,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function classSnapshots(state: AppState, classId: string): Snapshot[] {
  return state.snapshots
    .filter((s) => s.classId === classId && !s.deletedAt)
    .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
}