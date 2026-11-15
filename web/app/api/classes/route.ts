import { NextResponse } from "next/server";
import { DATABASE_ID, ID, TABLES, tablesDb } from "@/lib/server/appwrite";
import { requireAdmin, requireUser, AuthError } from "@/lib/server/session";
import { listClasses } from "@/lib/server/repository";
import { CLASS_NAME_RE } from "@/lib/utils";

export async function GET() {
  try {
    await requireUser();
    const classes = await listClasses();
    return NextResponse.json({ classes });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: { name?: string; grade?: number; letter?: string; teacherIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const grade = Number(body.grade);
  const letter = (body.letter ?? "").trim().toUpperCase();
  const name = `${grade}${letter}`;
  if (!CLASS_NAME_RE.test(name)) {
    return NextResponse.json(
      { error: "Формат: параллель 7–11 и одна заглавная буква, без дефиса. Например, 9А." },
      { status: 400 },
    );
  }

  const existing = await listClasses();
  if (existing.some((c) => c.name === name)) {
    return NextResponse.json({ error: `Класс ${name} уже существует.` }, { status: 409 });
  }

  const row = await tablesDb().createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.classes,
    rowId: ID.unique(),
    data: {
      name,
      grade,
      letter,
      teacherIds: body.teacherIds ?? [],
      createdAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ class: { id: row.$id, name, grade, letter } });
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }

  let body: {
    id?: string;
    name?: string;
    grade?: number;
    letter?: string;
    teacherIds?: string[];
    deletedAt?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Не указан класс." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.grade !== undefined) data.grade = Number(body.grade);
  if (body.letter !== undefined) data.letter = body.letter;
  if (body.teacherIds !== undefined) data.teacherIds = body.teacherIds;
  if (body.deletedAt !== undefined) data.deletedAt = body.deletedAt ?? "";

  if (body.name !== undefined) {
    const name = String(body.name);
    if (!CLASS_NAME_RE.test(name)) {
      return NextResponse.json(
        { error: "Формат: параллель 7–11 и одна заглавная буква, без дефиса. Например, 9А." },
        { status: 400 },
      );
    }
    const existing = await listClasses();
    if (existing.some((c) => c.name === name && c.id !== body.id)) {
      return NextResponse.json({ error: `Класс ${name} уже существует.` }, { status: 409 });
    }
  }

  await tablesDb().updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.classes,
    rowId: body.id,
    data,
  });

  return NextResponse.json({ ok: true });
}
