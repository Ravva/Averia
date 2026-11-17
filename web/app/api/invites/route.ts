import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { DATABASE_ID, ID, TABLES, tablesDb, messagingApi } from "@/lib/server/appwrite";
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
    let body: { email?: string; classIds?: string[]; isAdmin?: boolean };
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
    const role = body.isAdmin ? "admin" : "teacher";

    const now = new Date();
    const token = ID.unique();
    const row = await tablesDb().createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.invites,
      rowId: ID.unique(),
      data: {
        email,
        classIds,
        token,
        status: "pending",
        invitedBy: admin.id,
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 7 * 86400_000).toISOString(),
        role,
      },
    });

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const inviteUrl = `https://${host}/invite/${token}`;

    const subject = "Приглашение в систему аналитики успеваемости Averia";
    const roleName = role === "admin" ? "администратора" : "учителя";
    const roleDescription = role === "admin"
      ? "Вы сможете управлять классами и приглашать сотрудников."
      : "Вы сможете работать с назначенными вам классами и анализировать успеваемость.";
    const htmlContent = `
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#E9EDF4;font-family:Arial,Helvetica,sans-serif;color:#132136;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#E9EDF4;">
    <tr><td align="center" style="padding:32px 12px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;">
        <tr><td style="padding:32px 24px 28px;border-bottom:1px solid #D8E1EC;">
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr>
              <td width="48" style="width:48px;vertical-align:middle;"><img src="https://${host}/averia-logo.png" width="48" height="48" alt="Логотип Averia" style="display:block;width:48px;height:48px;border:0;border-radius:10px;"></td>
              <td style="padding-left:14px;vertical-align:middle;"><span style="display:block;font-size:23px;line-height:27px;font-weight:700;letter-spacing:-0.03em;color:#132136;">Averia<span style="color:#245DB0;">.</span></span><span style="display:block;margin-top:2px;font-size:12px;line-height:18px;color:#51647C;">Аналитика успеваемости</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:38px 24px 40px;">
          <h1 style="margin:0 0 14px;font-size:27px;line-height:34px;letter-spacing:-0.02em;color:#132136;">Вас пригласили в Averia</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:24px;color:#51647C;">Здравствуйте! Администратор школы приглашает вас присоединиться к системе аналитики успеваемости.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#142E54;border-radius:12px;">
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 8px;font-size:20px;line-height:26px;font-weight:700;color:#FFFFFF;">Доступ ${roleName}</p>
              <p style="margin:0;font-size:14px;line-height:22px;color:#E2ECFA;">${roleDescription}</p>
            </td></tr>
          </table>
          <p style="margin:28px 0 20px;font-size:15px;line-height:24px;color:#51647C;">Чтобы создать аккаунт, перейдите по ссылке приглашения:</p>
          <table role="presentation" cellspacing="0" cellpadding="0">
            <tr><td align="center" bgcolor="#245DB0" style="border-radius:8px;background-color:#245DB0;">
              <a href="${inviteUrl}" style="display:inline-block;padding:15px 24px;border-radius:8px;color:#FFFFFF;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;">Принять приглашение</a>
            </td></tr>
          </table>
          <p style="margin:28px 0 6px;font-size:13px;line-height:20px;color:#51647C;">Если кнопка не работает, скопируйте ссылку:</p>
          <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${inviteUrl}" style="color:#245DB0;text-decoration:underline;">${inviteUrl}</a></p>
        </td></tr>
        <tr><td style="padding:22px 24px 26px;border-top:1px solid #D8E1EC;background-color:#F0F5FA;border-radius:0 0 12px 12px;">
          <p style="margin:0;font-size:12px;line-height:19px;color:#51647C;">Ссылка действительна 7 дней. Если вы не ожидали приглашения, просто проигнорируйте это письмо.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `;

    try {
      await messagingApi().createEmail({
        messageId: ID.unique(),
        subject,
        content: htmlContent,
        html: true,
        emails: [email],
      });
    } catch (mailErr) {
      console.error("Failed to send invite email:", mailErr);
    }

    return NextResponse.json({ invite: { ...row, token: String(row.token) } });
  } catch (e) {
    console.error("Invites POST error:", e);
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Ошибка сервера: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
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
