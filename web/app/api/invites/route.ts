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

    const htmlContent = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Приглашение в Аверию</title>
</head>
<body style="margin: 0; padding: 0; background-color: #E9EDF4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #132136;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #E9EDF4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border: 1px solid #A8B8CC; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 32px rgba(24, 54, 96, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #D8E1EC;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #132136;">Аверия</span>
                    <span style="font-size: 13px; color: #51647C; display: block; margin-top: 4px;">Школьная аналитика и управление классами</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #132136; letter-spacing: -0.02em;">Приглашение для преподавателя</h1>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #51647C;">
                Здравствуйте!<br>
                Администратор пригласил вас присоединиться к платформе Аверия. После принятия приглашения вы получите доступ к классам, расписанию и журналам успеваемости.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #245DB0;">
                    <a href="${inviteUrl}" target="_blank" style="font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #245DB0; display: inline-block;">Принять приглашение и войти</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.5; color: #51647C;">
                Или скопируйте эту ссылку в адресную строку браузера:<br>
                <a href="${inviteUrl}" style="color: #245DB0; word-break: break-all; text-decoration: underline;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F0F5FA; padding: 24px 40px; border-top: 1px solid #D8E1EC; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #51647C;">
                Ссылка действительна в течение 7 дней.<br>
                Если вы не ожидали это приглашение, просто проигнорируйте письмо.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    try {
      await messagingApi().createEmail({
        messageId: ID.unique(),
        subject: "Приглашение в Аверию",
        content: htmlContent,
        html: true,
        emails: [email],
      });
    } catch (mailErr) {
      console.error("Failed to send invite email:", mailErr);
    }

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
