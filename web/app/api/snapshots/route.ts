import { NextResponse } from "next/server";
import { AppwriteException } from "node-appwrite";
import { DATABASE_ID, ID, TABLES, tablesDb, withRetry } from "@/lib/server/appwrite";
import { AuthError, requireUser } from "@/lib/server/session";
import { listClasses, listSnapshots } from "@/lib/server/repository";
import { parseUpload, UploadError } from "@/lib/server/upload";

export async function GET(request: Request) {
  try {
    await requireUser();
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId") ?? undefined;
    const snapshots = await listSnapshots(classId);
    return NextResponse.json({ snapshots });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

/**
 * The file is parsed and re-computed on the server, so the stored payload always
 * matches the arithmetic the dashboard shows. `?preview=1` only parses and returns
 * the numbers without writing anything.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    const classId = String(form.get("classId") ?? "");
    const preview = new URL(request.url).searchParams.get("preview") === "1";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл не передан." }, { status: 400 });
    }

    const result = await parseUpload(classId, file, user.id, user.role === "admin");

    if (preview) {
      return NextResponse.json({
        payload: result.payload,
        fileName: result.fileName,
        dataDate: result.dataDate,
        warnings: result.warnings,
      });
    }

    // The row id is generated once and reused across retries: if the first
    // attempt reached the database but its response was lost, the retry hits
    // the same row instead of creating a second copy of the same slice.
    const rowId = ID.unique();
    try {
      await withRetry(() =>
        tablesDb().createRow({
          databaseId: DATABASE_ID,
          tableId: TABLES.snapshots,
          rowId,
          data: {
            classId,
            fileName: result.fileName,
            dataDate: result.dataDate,
            periodStart: result.payload.periodStart ?? "",
            uploadedAt: new Date().toISOString(),
            uploadedBy: user.id,
            students: result.payload.kpis.students,
            avg: result.payload.kpis.avg,
            payload: JSON.stringify(result.payload),
          },
        }),
      );
    } catch (e) {
      const alreadyStored =
        e instanceof AppwriteException && e.code === 409;
      if (!alreadyStored) throw e;
    }

    return NextResponse.json({
      snapshot: { classId, fileName: result.fileName, dataDate: result.dataDate },
      warnings: result.warnings,
    });
  } catch (e) {
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}

/** Soft-delete and restore of a snapshot. */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    let body: { id?: string; deletedAt?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
    }
    if (!body.id) {
      return NextResponse.json({ error: "Не указан срез." }, { status: 400 });
    }

    let row: { $id: string; classId: string; uploadedBy: string } | undefined;
    try {
      row = (await tablesDb().getRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.snapshots,
        rowId: body.id,
      })) as unknown as { $id: string; classId: string; uploadedBy: string };
    } catch {
      row = undefined;
    }
    if (!row) {
      return NextResponse.json({ error: "Срез не найден." }, { status: 404 });
    }

    const classes = await listClasses();
    const room = classes.find((c) => c.id === row.classId);
    const allowed =
      user.role === "admin" ||
      row.uploadedBy === user.id ||
      (room?.teacherIds ?? []).includes(user.id);
    if (!allowed) {
      return NextResponse.json({ error: "Нет прав на этот срез." }, { status: 403 });
    }

    await tablesDb().updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.snapshots,
      rowId: body.id,
      data: { deletedAt: body.deletedAt ?? "" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
