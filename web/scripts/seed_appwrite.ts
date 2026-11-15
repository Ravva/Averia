/**
 * Loads the synthetic demo data (classes, snapshots) into Appwrite so the
 * application opens populated, the way the localStorage prototype did.
 *
 * Run with: npx tsx scripts/seed_appwrite.ts
 */
import { Client, TablesDB, Users, Account, ID, Query } from "node-appwrite";
import { readFileSync } from "node:fs";
import payloads from "../lib/seed/payloads.json";
import type { Payload } from "../lib/types";

const env = Object.fromEntries(
  readFileSync(new URL("../../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const databaseId = env.APPWRITE_DATABASE_ID || "averia";

const client = new Client()
  .setEndpoint(env.APPWRITE_ENDPOINT!)
  .setProject(env.APPWRITE_PROJECT_ID!)
  .setKey(env.APPWRITE_API_KEY!);

const tables = new TablesDB(client);
const users = new Users(client);

const DEMO_CLASSES = [
  { name: "9А", grade: 9, letter: "А" },
  { name: "7Б", grade: 7, letter: "Б" },
  { name: "10В", grade: 10, letter: "В" },
];

const seed = payloads as unknown as Record<string, { prev: Payload; curr: Payload }>;

async function ensureUser(email: string, password: string, name: string, role: string) {
  const list = await users.list({ queries: [Query.equal("email", email)] });
  if (list.total > 0) {
    const existing = list.users[0];
    const profiles = await tables.listRows({
      databaseId,
      tableId: "profiles",
      queries: [Query.equal("userId", existing.$id), Query.limit(1)],
    });
    if (profiles.rows.length === 0) {
      await tables.createRow({
        databaseId,
        tableId: "profiles",
        rowId: existing.$id,
        data: { userId: existing.$id, name, email, role, createdAt: new Date().toISOString() },
      });
      console.log(`profile for ${email}: created`);
    }
    return existing.$id;
  }
  const u = await users.create({ userId: ID.unique(), email, password, name });
  await tables.createRow({
    databaseId,
    tableId: "profiles",
    rowId: u.$id,
    data: { userId: u.$id, name, email, role, createdAt: new Date().toISOString() },
  });
  console.log(`user ${email}: created`);
  return u.$id;
}

const ADMIN_EMAIL = "admin@averia.school";
const ADMIN_PASSWORD = env.APPWRITE_ADMIN_PASSWORD;
const TEACHER_PASSWORD = env.APPWRITE_TEACHER_PASSWORD;

async function main() {
  if (!ADMIN_PASSWORD || !TEACHER_PASSWORD) {
    throw new Error(
      "Задайте APPWRITE_ADMIN_PASSWORD и APPWRITE_TEACHER_PASSWORD в .env.local. " +
        "Пароли не должны попадать в репозиторий.",
    );
  }
  const adminId = await ensureUser(
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "Администратор школы",
    "admin",
  );
  const teacher1 = await ensureUser("teacher1@school.ru", TEACHER_PASSWORD, "Учитель 1", "teacher");
  const teacher2 = await ensureUser("teacher2@school.ru", TEACHER_PASSWORD, "Учитель 2", "teacher");

  const teachersByClass: Record<string, string> = {
    "9А": adminId,
    "7Б": teacher1,
    "10В": teacher2,
  };

  const existingClasses = await tables.listRows({
    databaseId,
    tableId: "classes",
    queries: [Query.limit(200)],
  });
  const classIds = new Map<string, string>();
  for (const row of existingClasses.rows as unknown as { $id: string; name: string }[]) {
    classIds.set(row.name, row.$id);
  }

  for (const spec of DEMO_CLASSES) {
    const teacherId = teachersByClass[spec.name];
    if (classIds.has(spec.name)) {
      const existing = classIds.get(spec.name)!;
      const row = await tables.getRow({ databaseId, tableId: "classes", rowId: existing });
      const teacherIds = Array.isArray(row.teacherIds) ? (row.teacherIds as string[]) : [];
      if (!teacherIds.includes(teacherId)) {
        await tables.updateRow({
          databaseId,
          tableId: "classes",
          rowId: existing,
          data: { teacherIds: [...teacherIds, teacherId] },
        });
        console.log(`class ${spec.name}: teacher assigned`);
      }
      continue;
    }
    const row = await tables.createRow({
      databaseId,
      tableId: "classes",
      rowId: ID.unique(),
      data: {
        name: spec.name,
        grade: spec.grade,
        letter: spec.letter,
        teacherIds: [teacherId],
        createdAt: "2026-09-01T08:00:00.000Z",
      },
    });
    classIds.set(spec.name, row.$id);
    console.log(`class ${spec.name}: created`);
  }

  for (const [className, pair] of Object.entries(seed)) {
    const classId = classIds.get(className);
    if (!classId) {
      console.log(`class ${className}: missing, skipped`);
      continue;
    }
    const uploader = teachersByClass[className] ?? adminId;

    const slices: { payload: Payload; uploadedAt: string; fileName: string }[] = [
      {
        payload: pair.prev,
        uploadedAt: "2026-10-22T09:30:00.000Z",
        fileName: `averageMarks_${pair.prev.date}.xlsx`,
      },
      {
        payload: pair.curr,
        uploadedAt: "2026-11-09T14:00:00.000Z",
        fileName: `averageMarks_${pair.curr.date}.xlsx`,
      },
    ];

    for (const slice of slices) {
      const dup = await tables.listRows({
        databaseId,
        tableId: "snapshots",
        queries: [
          Query.equal("classId", classId),
          Query.equal("dataDate", slice.payload.date),
          Query.limit(1),
        ],
      });
      if (dup.rows.length > 0) continue;
      await tables.createRow({
        databaseId,
        tableId: "snapshots",
        rowId: ID.unique(),
        data: {
          classId,
          fileName: slice.fileName,
          dataDate: slice.payload.date,
          periodStart: slice.payload.periodStart ?? "",
          uploadedAt: slice.uploadedAt,
          uploadedBy: uploader,
          students: slice.payload.kpis.students,
          avg: slice.payload.kpis.avg,
          payload: JSON.stringify(slice.payload),
        },
      });
      console.log(`snapshot ${className} ${slice.payload.date}: created`);
    }
  }

  const account = new Account(client);
  const session = await account.createEmailPasswordSession({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  console.log(`session ok: ${session.$id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
