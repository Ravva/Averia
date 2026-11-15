import { NextResponse } from "next/server";
import { createSession } from "@/lib/server/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
  }

  try {
    const user = await createSession(email, password);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Неверный email или пароль." },
      { status: 401 },
    );
  }
}
