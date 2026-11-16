import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { DATABASE_ID, ID, TABLES, tablesDb, usersApi } from "@/lib/server/appwrite";
import { createSession } from "@/lib/server/session";
import { getInviteByToken } from "@/lib/server/repository";

/** Public read: tells the invite page whether the link is still usable. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite) {
    return NextResponse.json({ error: "Ссылка не найдена." }, { status: 404 });
  }
  const expired = new Date(invite.expiresAt).getTime() < Date.now();
  const classes = await tablesDb().listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.classes,
    queries: [Query.limit(200)],
  });
  const classNames = (
    classes.rows as unknown as { $id: string; name: string; deletedAt?: string }[]
  )
    .filter((c) => invite.classIds.includes(c.$id) && !c.deletedAt)
    .map((c) => c.name);

  return NextResponse.json({
    email: invite.email,
    expiresAt: invite.expiresAt,
    status: invite.status,
    expired,
    classNames,
  });
}

/** Teacher accepts the invite: creates the account and claims the classes. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return NextResponse.json({ error: "Ссылка не найдена." }, { status: 404 });
  }
  if (invite.status === "revoked") {
    return NextResponse.json({ error: "Ссылка отозвана администратором." }, { status: 410 });
  }
  if (invite.status === "accepted") {
    return NextResponse.json({ error: "Ссылка уже использована." }, { status: 410 });
  }
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ error: "Срок действия ссылки истёк." }, { status: 410 });
  }

  let body: { name?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const password = body.password ?? "";
  if (name.length < 2) {
    return NextResponse.json({ error: "Укажите имя и фамилию." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Пароль — минимум 6 символов." }, { status: 400 });
  }

  const users = usersApi();
  const existing = await users.list({ queries: [Query.equal("email", invite.email)] });
  if (existing.total > 0) {
    return NextResponse.json(
      { error: "Этот email уже зарегистрирован." },
      { status: 409 },
    );
  }

  const user = await users.create({
    userId: ID.unique(),
    email: invite.email,
    password,
    name,
  });

  await tablesDb().createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.profiles,
    rowId: user.$id,
    data: {
      userId: user.$id,
      name,
      email: invite.email,
      role: invite.role ?? "teacher",
      createdAt: new Date().toISOString(),
    },
  });

  for (const classId of invite.classIds) {
    try {
      const row = await tablesDb().getRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.classes,
        rowId: classId,
      });
      const teacherIds = Array.isArray(row.teacherIds) ? (row.teacherIds as string[]) : [];
      if (!teacherIds.includes(user.$id)) {
        await tablesDb().updateRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.classes,
          rowId: classId,
          data: { teacherIds: [...teacherIds, user.$id] },
        });
      }
    } catch {
      // class removed in the meantime — the teacher simply gets no access to it
    }
  }

  await tablesDb().updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.invites,
    rowId: invite.id,
    data: { status: "accepted" },
  });

  const sessionUser = await createSession(invite.email, password);
  return NextResponse.json({ user: sessionUser });
}
