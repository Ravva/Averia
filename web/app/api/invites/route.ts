import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { DATABASE_ID, ID, TABLES, tablesDb } from "@/lib/server/appwrite";
import { AuthError, requireAdmin, requireUser } from "@/lib/server/session";
import { listClasses, listUsers } from "@/lib/server/repository";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await tablesDb().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      queries: [
        Query.orderDesc("createdAt"),
        Query.limit(500),
        ...(user.role === "admin" ? [] : [Query.equal("invitedBy", user.id)]),
      ],
    });
    return NextResponse.json({ invites: rows.rows });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

/** Admin creates a one-off invite link. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    let body: { email?: string; classIds?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
    }

    const users = await listUsers();
    if (users.some((u) => u.email === email)) {
      return NextResponse.json(
        { error: "Этот email уже зарегистрирован — учитель может войти сам." },
        { status: 409 },
      );
    }

    const classes = await listClasses();
    const classIds = (body.classIds ?? []).filter((id) => classes.some((c) => c.id === id));

    const now = new Date();
    const row = await tablesDb().createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      rowId: ID.unique(),
      data: {
        email,
        classIds,
        token: ID.unique(),
        status: "pending",
        invitedBy: admin.id,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
      },
    });

    return NextResponse.json({ invite: { ...row, token: String(row.token) } });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

/** Admin revokes a pending invite. */
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    let body: { id?: string; status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
    }
    if (!body.id || body.status !== "revoked") {
      return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
    }
    await tablesDb().updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      rowId: body.id,
      data: { status: "revoked" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
