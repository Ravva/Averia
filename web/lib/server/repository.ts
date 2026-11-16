import "server-only";
import { Query } from "node-appwrite";
import { tablesDb, DATABASE_ID, TABLES, withRetry } from "./appwrite";
import type { ClassRoom, Invite, InviteStatus, Payload, Role, Snapshot } from "@/lib/types";

interface Row {
  $id: string;
  [key: string]: unknown;
}

function toUser(row: Row) {
  return {
    id: String(row.userId),
    name: String(row.name),
    email: String(row.email),
    role: String(row.role) as Role,
    createdAt: String(row.createdAt),
  };
}

function toClass(row: Row): ClassRoom {
  return {
    id: row.$id,
    name: String(row.name),
    grade: Number(row.grade),
    letter: String(row.letter),
    teacherIds: Array.isArray(row.teacherIds) ? (row.teacherIds as string[]) : [],
    createdAt: String(row.createdAt),
    deletedAt: row.deletedAt ? String(row.deletedAt) : undefined,
  };
}

function toInvite(row: Row): Invite {
  return {
    id: row.$id,
    email: String(row.email),
    classIds: Array.isArray(row.classIds) ? (row.classIds as string[]) : [],
    token: String(row.token),
    createdAt: String(row.createdAt),
    expiresAt: String(row.expiresAt),
    status: String(row.status) as InviteStatus,
    invitedBy: String(row.invitedBy),
    role: (row.role ? String(row.role) : "teacher") as Role,
  };
}

function toSnapshot(row: Row): Snapshot {
  return {
    id: row.$id,
    classId: String(row.classId),
    fileName: "",
    dataDate: String(row.dataDate),
    periodStart: row.periodStart ? String(row.periodStart) : "",
    uploadedAt: String(row.uploadedAt),
    uploadedBy: String(row.uploadedBy),
    payload: (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) as Payload,
    deletedAt: row.deletedAt ? String(row.deletedAt) : undefined,
  };
}

export async function listUsers() {
  const rows = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.profiles,
      queries: [Query.orderAsc("createdAt"), Query.limit(200)],
    }),
  );
  return (rows.rows as unknown as Row[]).map(toUser);
}

export async function listClasses(includeDeleted = false) {
  const queries: string[] = [Query.orderAsc("name"), Query.limit(500)];
  if (!includeDeleted) queries.push(Query.isNull("deletedAt"));
  const rows = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.classes,
      queries,
    }),
  );
  return (rows.rows as unknown as Row[]).map(toClass);
}

export async function listInvites() {
  const rows = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      queries: [Query.orderDesc("createdAt"), Query.limit(500)],
    }),
  );
  return (rows.rows as unknown as Row[]).map(toInvite);
}

export async function listSnapshots(classId?: string) {
  const queries: string[] = [Query.orderAsc("uploadedAt"), Query.limit(1000)];
  if (classId) queries.push(Query.equal("classId", classId));
  const rows = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.snapshots,
      queries,
    }),
  );
  return (rows.rows as unknown as Row[]).map(toSnapshot);
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const rows = await withRetry(() =>
    tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      queries: [Query.equal("token", token), Query.limit(1)],
    }),
  );
  const row = rows.rows[0] as unknown as Row | undefined;
  return row ? toInvite(row) : null;
}

export async function getClass(id: string): Promise<ClassRoom | null> {
  try {
    const row = await tablesDb().getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.classes,
      rowId: id,
    });
    return toClass(row as unknown as Row);
  } catch {
    return null;
  }
}
