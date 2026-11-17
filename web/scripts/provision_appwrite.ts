/**
 * One-off provisioning of the Appwrite schema for Averia.
 * Run with: npx tsx scripts/provision_appwrite.ts
 */
import { Client, TablesDB, Users, Account, ID, Query, TablesDBIndexType } from "node-appwrite";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const endpoint = env.APPWRITE_ENDPOINT!;
const projectId = env.APPWRITE_PROJECT_ID!;
const apiKey = env.APPWRITE_API_KEY!;
const databaseId = env.APPWRITE_DATABASE_ID || "averia";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const tables = new TablesDB(client);
const users = new Users(client);
const account = new Account(client);

type Col =
  | { kind: "string"; key: string; size: number; required?: boolean; array?: boolean }
  | { kind: "text"; key: string; required?: boolean; array?: boolean }
  | { kind: "mediumtext"; key: string; required?: boolean; array?: boolean }
  | { kind: "datetime"; key: string; required?: boolean; array?: boolean }
  | { kind: "integer"; key: string; required?: boolean; array?: boolean }
  | { kind: "float"; key: string; required?: boolean; array?: boolean }
  | { kind: "boolean"; key: string; required?: boolean; array?: boolean }
  | { kind: "enum"; key: string; elements: string[]; required?: boolean; array?: boolean };

type TableSpec = {
  id: string;
  name: string;
  columns: Col[];
  indexes: { key: string; columns: string[]; unique?: boolean }[];
};

const SPECS: TableSpec[] = [
  {
    id: "profiles",
    name: "Профили",
    columns: [
      { kind: "string", key: "userId", size: 64, required: true },
      { kind: "string", key: "name", size: 128, required: true },
      { kind: "string", key: "email", size: 128, required: true },
      { kind: "enum", key: "role", elements: ["admin", "teacher"], required: true },
      { kind: "datetime", key: "createdAt", required: true },
    ],
    indexes: [
      { key: "userId_unique", columns: ["userId"], unique: true },
      { key: "role_idx", columns: ["role"] },
    ],
  },
  {
    id: "classes",
    name: "Классы",
    columns: [
      { kind: "string", key: "name", size: 16, required: true },
      { kind: "integer", key: "grade", required: true },
      { kind: "string", key: "letter", size: 8, required: true },
      { kind: "string", key: "teacherIds", size: 64, array: true },
      { kind: "datetime", key: "createdAt", required: true },
      { kind: "datetime", key: "deletedAt" },
    ],
    indexes: [{ key: "grade_idx", columns: ["grade"] }],
  },
  {
    id: "invites",
    name: "Приглашения",
    columns: [
      { kind: "string", key: "email", size: 128, required: true },
      { kind: "string", key: "classIds", size: 64, array: true },
      { kind: "string", key: "token", size: 64, required: true },
      { kind: "enum", key: "status", elements: ["pending", "accepted", "revoked"], required: true },
      { kind: "string", key: "invitedBy", size: 64, required: true },
      { kind: "datetime", key: "createdAt", required: true },
      { kind: "datetime", key: "expiresAt", required: true },
      { kind: "enum", key: "role", elements: ["admin", "teacher"], required: false },
    ],
    indexes: [
      { key: "token_unique", columns: ["token"], unique: true },
      { key: "email_idx", columns: ["email"] },
      { key: "status_idx", columns: ["status"] },
    ],
  },
  {
    id: "snapshots",
    name: "Срезы",
    columns: [
      { kind: "string", key: "classId", size: 64, required: true },
      { kind: "string", key: "fileName", size: 256, required: true },
      { kind: "string", key: "dataDate", size: 32, required: true },
      { kind: "string", key: "periodStart", size: 32 },
      { kind: "datetime", key: "uploadedAt", required: true },
      { kind: "string", key: "uploadedBy", size: 64, required: true },
      { kind: "integer", key: "students" },
      { kind: "float", key: "avg" },
      { kind: "mediumtext", key: "payload", required: true },
      { kind: "datetime", key: "deletedAt" },
    ],
    indexes: [
      { key: "class_idx", columns: ["classId"] },
      { key: "classDate_idx", columns: ["classId", "dataDate"] },
    ],
  },
];

async function ensureDatabase() {
  try {
    await tables.get({ databaseId });
    console.log(`database ${databaseId}: ok`);
  } catch {
    await tables.create({ databaseId, name: "Averia", enabled: true });
    console.log(`database ${databaseId}: created`);
  }
}

async function ensureTable(spec: TableSpec) {
  try {
    await tables.getTable({ databaseId, tableId: spec.id });
    console.log(`table ${spec.id}: exists`);
  } catch {
    await tables.createTable({
      databaseId,
      tableId: spec.id,
      name: spec.name,
      enabled: true,
      permissions: [],
      rowSecurity: false,
    });
    console.log(`table ${spec.id}: created`);
  }
}

async function ensureColumns(spec: TableSpec) {
  const existing = await tables.listColumns({ databaseId, tableId: spec.id });
  const have = new Set(existing.columns.map((c) => c.key));
  for (const col of spec.columns) {
    if (have.has(col.key)) continue;
    const base = {
      databaseId,
      tableId: spec.id,
      key: col.key,
      required: col.required ?? false,
      ...(col.array !== undefined ? { array: col.array } : {}),
    };
    switch (col.kind) {
      case "string":
        await tables.createStringColumn({ ...base, size: col.size });
        break;
      case "text":
        await tables.createTextColumn(base);
        break;
      case "mediumtext":
        await tables.createMediumtextColumn(base);
        break;
      case "datetime":
        await tables.createDatetimeColumn(base);
        break;
      case "integer":
        await tables.createIntegerColumn(base);
        break;
      case "float":
        await tables.createFloatColumn(base);
        break;
      case "boolean":
        await tables.createBooleanColumn(base);
        break;
      case "enum":
        await tables.createEnumColumn({ ...base, elements: col.elements });
        break;
    }
    console.log(`  column ${spec.id}.${col.key}: created (${col.kind})`);
  }
}

async function ensureIndexes(spec: TableSpec) {
  const existing = await tables.listIndexes({ databaseId, tableId: spec.id });
  const have = new Set(existing.indexes.map((i) => i.key));
  for (const idx of spec.indexes) {
    if (have.has(idx.key)) continue;
    await tables.createIndex({
      databaseId,
      tableId: spec.id,
      key: idx.key,
      type: idx.unique ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
      columns: idx.columns,
    });
    console.log(`  index ${spec.id}.${idx.key}: created`);
  }
  for (const idx of existing.indexes) {
    const wanted = spec.indexes.find((i) => i.key === idx.key);
    if (wanted) continue;
    await tables.deleteIndex({ databaseId, tableId: spec.id, key: idx.key });
    console.log(`  index ${spec.id}.${idx.key}: removed (not in spec)`);
  }
}

async function ensureAdmin() {
  const email = "admin@averia.school";
  const password = env.APPWRITE_ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "Задайте APPWRITE_ADMIN_PASSWORD в .env.local — пароль администратора. В репозитории его быть не должно.",
    );
  }
  const list = await users.list({ queries: [Query.equal("email", email)] });
  if (list.total > 0) {
    const admin = list.users[0];
    const profiles = await tables.listRows({
      databaseId,
      tableId: "profiles",
      queries: [Query.equal("userId", admin.$id)],
    });
    const row = profiles.rows[0];
    if (row && !(row as { email?: string }).email) {
      await tables.updateRow({
        databaseId,
        tableId: "profiles",
        rowId: row.$id,
        data: { email },
      });
      console.log("admin profile: email backfilled");
    }
    console.log(`admin user: exists (${admin.$id})`);
    return admin.$id;
  }
  const u = await users.create({
    userId: ID.unique(),
    email,
    password,
    name: "Администратор школы",
  });
  await tables.createRow({
    databaseId,
    tableId: "profiles",
    rowId: u.$id,
    data: {
      userId: u.$id,
      name: "Администратор школы",
      email,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  });
  console.log(`admin user ${u.$id}: created`);
  return u.$id;
}

async function main() {
  await ensureDatabase();
  for (const spec of SPECS) {
    await ensureTable(spec);
    await ensureColumns(spec);
    await ensureIndexes(spec);
  }
  await ensureAdmin();

  const session = await account.createEmailPasswordSession({
    email: "admin@averia.school",
    password: env.APPWRITE_ADMIN_PASSWORD,
  });
  const me = await users.get({ userId: (session as unknown as { userId: string }).userId });
  console.log(`session ok: ${me.email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
