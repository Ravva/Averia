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
import { api, ApiError } from "./api";
import type { AppState, ClassRoom, Invite, Payload, Snapshot, User } from "./types";

const EMPTY: AppState = { users: [], classes: [], invites: [], snapshots: [] };

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  currentUser: User | null;
  visibleClasses: ClassRoom[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createClass: (data: {
    name: string;
    grade: number;
    letter: string;
    teacherIds: string[];
  }) => Promise<ClassRoom>;
  updateClass: (
    id: string,
    patch: Partial<ClassRoom> & { deletedAt?: string | null },
  ) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  restoreClass: (id: string) => Promise<void>;
  createInvite: (email: string, classIds: string[], isAdmin?: boolean) => Promise<Invite>;
  revokeInvite: (id: string) => Promise<void>;
  acceptInvite: (token: string, name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  addSnapshot: (classId: string, payload: Payload, fileName: string) => Promise<Snapshot>;
  deleteSnapshot: (id: string) => Promise<void>;
  restoreSnapshot: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.state();
      setCurrentUser(data.user);
      setState({
        users: data.users,
        classes: data.classes,
        invites: data.invites,
        snapshots: data.snapshots,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setCurrentUser(null);
        setState(EMPTY);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.state();
        if (!alive) return;
        setCurrentUser(data.user);
        setState({
          users: data.users,
          classes: data.classes,
          invites: data.invites,
          snapshots: data.snapshots,
        });
      } catch {
        if (!alive) return;
        setCurrentUser(null);
        setState(EMPTY);
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visibleClasses = useMemo(
    () => state.classes.filter((c) => !c.deletedAt),
    [state.classes],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { user } = await api.login(email, password);
        setCurrentUser(user);
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // session already gone
    }
    setCurrentUser(null);
    setState(EMPTY);
  }, []);

  const createClass = useCallback(
    async (data: { name: string; grade: number; letter: string; teacherIds: string[] }) => {
      const { class: room } = await api.createClass(data);
      await refresh();
      return {
        id: room.id,
        ...data,
        createdAt: new Date().toISOString(),
      };
    },
    [refresh],
  );

  const updateClass = useCallback(
    async (id: string, patch: Partial<ClassRoom>) => {
      await api.updateClass(id, patch);
      await refresh();
    },
    [refresh],
  );

  const deleteClass = useCallback(
    async (id: string) => {
      await api.updateClass(id, { deletedAt: new Date().toISOString() });
      await refresh();
    },
    [refresh],
  );

  const restoreClass = useCallback(
    async (id: string) => {
      await api.updateClass(id, { deletedAt: null });
      await refresh();
    },
    [refresh],
  );

  const createInvite = useCallback(
    async (email: string, classIds: string[], isAdmin = false) => {
      const { invite } = await api.createInvite(email, classIds, isAdmin);
      await refresh();
      return invite;
    },
    [refresh],
  );

  const revokeInvite = useCallback(
    async (id: string) => {
      await api.revokeInvite(id);
      await refresh();
    },
    [refresh],
  );

  const acceptInvite = useCallback(
    async (token: string, name: string, password: string) => {
      try {
        const { user } = await api.acceptInvite(token, name, password);
        setCurrentUser(user);
        await refresh();
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof ApiError ? e.message : "Не удалось принять приглашение.",
        };
      }
    },
    [refresh],
  );

  const addSnapshot = useCallback(
    async (classId: string, payload: Payload, fileName: string) => {
      const snapshot: Snapshot = {
        id: "",
        classId,
        fileName,
        dataDate: payload.date,
        periodStart: payload.periodStart ?? "",
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.id ?? "",
        payload,
      };
      await refresh();
      return snapshot;
    },
    [refresh, currentUser],
  );

  const deleteSnapshot = useCallback(
    async (id: string) => {
      await api.setSnapshotDeleted(id, new Date().toISOString());
      await refresh();
    },
    [refresh],
  );

  const restoreSnapshot = useCallback(
    async (id: string) => {
      await api.setSnapshotDeleted(id, null);
      await refresh();
    },
    [refresh],
  );

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
    refresh,
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
