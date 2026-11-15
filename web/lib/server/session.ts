import "server-only";
import { cookies } from "next/headers";
import { Query } from "node-appwrite";
import { accountApi, tablesDb, usersApi, DATABASE_ID, TABLES, withRetry } from "./appwrite";
import type { Role } from "@/lib/types";

const SESSION_COOKIE = "averia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

interface ProfileRow {
  $id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

/**
 * Appwrite sessions live on the server; the browser only carries the session id
 * in an httpOnly cookie. The session secret never reaches the client.
 */
export async function createSession(email: string, password: string): Promise<SessionUser> {
  const account = accountApi();
  const session = await account.createEmailPasswordSession({ email, password });
  const userId = (session as unknown as { userId: string }).userId;

  const store = await cookies();
  store.set(SESSION_COOKIE, session.$id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return getUserById(userId);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    try {
      const account = accountApi();
      await account.deleteSession({ sessionId });
    } catch {
      // session already expired or removed
    }
  }
  store.delete(SESSION_COOKIE);
}

/**
 * The API key has no `account` scope, so the session is validated through the
 * users API: the session id is matched against the sessions of the profile owner.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const tables = tablesDb();
  const profiles = await withRetry(() =>
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.profiles,
      queries: [Query.limit(100)],
    }),
  );

  const users = usersApi();
  for (const row of profiles.rows as unknown as ProfileRow[]) {
    let sessions;
    try {
      sessions = await withRetry(() => users.listSessions({ userId: row.userId }));
    } catch {
      continue;
    }
    const match = sessions.sessions.find((s) => s.$id === sessionId);
    if (!match) continue;
    if (match.expire && new Date(match.expire).getTime() < Date.now()) return null;
    return {
      id: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt,
    };
  }
  return null;
}

export async function getUserById(userId: string): Promise<SessionUser> {
  const tables = tablesDb();
  const rows = await withRetry(() =>
    tables.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.profiles,
      queries: [Query.equal("userId", userId), Query.limit(1)],
    }),
  );
  const row = rows.rows[0] as unknown as ProfileRow | undefined;
  if (!row) throw new Error("Профиль пользователя не найден.");
  return {
    id: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Требуется вход в систему.", 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError("Доступно только администратору.", 403);
  return user;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
